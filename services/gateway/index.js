const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { createServiceLogger } = require('../shared/logger');
const { store } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 9000;
const logger = createServiceLogger('api-gateway');

// Microservices URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:9001';
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:9002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:9003';

app.use(cors());
app.use(express.json());

// 1. Correlation ID & CloudWatch Audit Log Middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `corr-${uuidv4()}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);

    logger.info(`HTTP ${req.method} ${req.originalUrl}`, {
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs),
      clientIp: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  });

  next();
});

// 2. Swagger UI Documentation
try {
  const swaggerDocument = yaml.load(path.join(__dirname, '../../docs/openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  logger.info('Swagger UI loaded at /api-docs');
} catch (err) {
  logger.warn('Failed loading Swagger file for /api-docs:', { error: err.message });
}

// Chaos Simulation State for Testiva Testing
let chaosConfig = {
  apiDelayMs: 0,
  fakeFailure: false,
  failureStatusCode: 500,
  failureEndpoint: 'all',
  failureErrorMessage: 'Simulated failure injected by Testiva Admin Lab'
};

// Admin endpoints to inspect and configure chaos settings
app.get('/api/v1/admin/chaos', (req, res) => {
  res.json({ success: true, chaos: chaosConfig });
});

app.post('/api/v1/admin/chaos', (req, res) => {
  chaosConfig = { ...chaosConfig, ...req.body };
  logger.warn('Testiva Chaos settings updated', { correlationId: req.correlationId, chaosConfig });
  res.json({ success: true, message: 'Chaos configuration updated', chaos: chaosConfig });
});

app.post('/api/v1/admin/chaos/reset', (req, res) => {
  chaosConfig = {
    apiDelayMs: 0,
    fakeFailure: false,
    failureStatusCode: 500,
    failureEndpoint: 'all',
    failureErrorMessage: 'Simulated failure injected by Testiva Admin Lab'
  };
  logger.info('Testiva Chaos settings reset to normal', { correlationId: req.correlationId });
  res.json({ success: true, message: 'Chaos configuration reset to default', chaos: chaosConfig });
});

// ============================================================================
// Database-Driven Validation Rules & Error Messages Endpoints
// ============================================================================
app.get('/api/v1/validation-rules', (req, res) => {
  const { module } = req.query;
  let rules = store.validation_rules || [];
  if (module && module !== 'ALL') {
    rules = rules.filter(r => r.module === module);
  }
  res.json({ success: true, count: rules.length, data: rules });
});

app.put('/api/v1/validation-rules/:id', (req, res) => {
  const { id } = req.params;
  const { error_message, is_active } = req.body;
  const rule = (store.validation_rules || []).find(r => r.id === id);

  if (!rule) {
    return res.status(404).json({ success: false, message: `Validation rule '${id}' not found.` });
  }

  if (error_message !== undefined) rule.error_message = String(error_message);
  if (is_active !== undefined) rule.is_active = Boolean(is_active);

  logger.info('Validation rule updated in database store', {
    correlationId: req.correlationId,
    ruleId: id,
    rule: `${rule.module}.${rule.field_name}.${rule.rule_code}`,
    newErrorMessage: rule.error_message
  });

  res.json({ success: true, message: 'Validation rule message updated successfully.', data: rule });
});

// 3. Reverse Proxy Route Handler Helper with Chaos Injection
function forwardRequest(targetBaseUrl) {
  return async (req, res) => {
    // 3a. Artificial API Latency Injection
    if (chaosConfig.apiDelayMs > 0) {
      logger.warn(`Injecting artificial API latency: ${chaosConfig.apiDelayMs}ms`, {
        correlationId: req.correlationId,
        url: req.originalUrl
      });
      await new Promise(resolve => setTimeout(resolve, chaosConfig.apiDelayMs));
    }

    // 3b. Artificial API Failure Injection
    if (chaosConfig.fakeFailure) {
      const match =
        chaosConfig.failureEndpoint === 'all' ||
        req.originalUrl.includes(chaosConfig.failureEndpoint);

      if (match) {
        logger.error(`Simulated failure triggered by Testiva Chaos Lab`, {
          correlationId: req.correlationId,
          statusCode: chaosConfig.failureStatusCode,
          url: req.originalUrl
        });
        return res.status(Number(chaosConfig.failureStatusCode)).json({
          success: false,
          error: 'TESTIVA_SIMULATED_FAILURE',
          message: chaosConfig.failureErrorMessage || 'Simulated failure from Testiva Chaos Lab',
          endpoint: req.originalUrl,
          statusCode: chaosConfig.failureStatusCode,
          timestamp: new Date().toISOString()
        });
      }
    }

    const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
    try {
      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          ...req.headers,
          host: new URL(targetBaseUrl).host,
          'x-correlation-id': req.correlationId
        },
        responseType: req.originalUrl.includes('/export') ? 'stream' : 'json',
        validateStatus: () => true // Allow non-2xx status to pass through
      });

      // Forward headers like Content-Type and Content-Disposition
      if (response.headers['content-type']) res.setHeader('content-type', response.headers['content-type']);
      if (response.headers['content-disposition']) res.setHeader('content-disposition', response.headers['content-disposition']);

      if (req.originalUrl.includes('/export')) {
        response.data.pipe(res);
      } else {
        res.status(response.status).json(response.data);
      }
    } catch (error) {
      logger.error('Proxy routing error to microservice', {
        correlationId: req.correlationId,
        targetUrl,
        error: error.message
      });
      res.status(502).json({
        success: false,
        message: `Gateway Error: Failed communicating with upstream service (${targetBaseUrl})`,
        error: error.message
      });
    }
  };
}

// Route mapping to microservices
app.use('/api/v1/auth', forwardRequest(AUTH_SERVICE_URL));
app.use('/api/v1/accounts', forwardRequest(ACCOUNT_SERVICE_URL));
app.use('/api/v1/transactions', forwardRequest(TRANSACTION_SERVICE_URL));
app.use('/api/v1/bills', forwardRequest(TRANSACTION_SERVICE_URL));

// Healthcheck endpoint for AWS ALB / ECS Target Group
app.get('/health', (req, res) => {
  res.json({
    gateway: 'UP',
    version: '1.0.0',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    services: {
      auth: AUTH_SERVICE_URL,
      account: ACCOUNT_SERVICE_URL,
      transaction: TRANSACTION_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`FinApex API Gateway operational on port ${PORT}`);
    console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
    console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
