const winston = require('winston');

/**
 * Enterprise CloudWatch Structured Logger
 * Emits JSON logs compatible with AWS CloudWatch Logs Insights and Metrics extraction.
 */
function createServiceLogger(serviceName) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'production',
      awsRegion: process.env.AWS_REGION || 'us-east-1'
    },
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
            return JSON.stringify({
              timestamp,
              level: level.toUpperCase(),
              service,
              correlationId: correlationId || 'N/A',
              message,
              ...meta
            });
          })
        )
      })
    ]
  });
}

module.exports = { createServiceLogger };
