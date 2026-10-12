const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServiceLogger } = require('../shared/logger');
const { store, getErrorMessage } = require('../shared/db');
const { JWT_SECRET } = require('../shared/authMiddleware');

const app = express();
const PORT = process.env.PORT || 9001;
const logger = createServiceLogger('auth-service');

app.use(cors());
app.use(express.json());

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}`;
  next();
});

// Helper for email and password policy validation (DB-driven error messages)
function validateLoginInput(email, password) {
  const errors = [];

  // 1. Email / Username Validation
  if (email === undefined || email === null || typeof email !== 'string' || email.trim() === '') {
    errors.push({
      field: 'email',
      message: getErrorMessage('AUTH', 'email', 'MANDATORY')
    });
  } else if (email.length < 4) {
    errors.push({
      field: 'email',
      message: getErrorMessage('AUTH', 'email', 'MIN_LENGTH', { min: 4, actual: email.length })
    });
  } else if (email.length > 100) {
    errors.push({
      field: 'email',
      message: getErrorMessage('AUTH', 'email', 'MAX_LENGTH', { max: 100, actual: email.length })
    });
  } else {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isUsername = /^[a-zA-Z0-9_]{4,20}$/.test(email);
    if (!emailRegex.test(email) && !isUsername) {
      errors.push({
        field: 'email',
        message: getErrorMessage('AUTH', 'email', 'INVALID_FORMAT')
      });
    }
  }

  // 2. Password Validation
  if (password === undefined || password === null || typeof password !== 'string' || password === '') {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'MANDATORY') });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'MIN_LENGTH', { min: 8, actual: password.length }) });
  } else if (password.length > 64) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'MAX_LENGTH', { max: 64, actual: password.length }) });
  } else if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'UPPERCASE') });
  } else if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'LOWERCASE') });
  } else if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'DIGIT') });
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push({ field: 'password', message: getErrorMessage('AUTH', 'password', 'SPECIAL_CHAR') });
  }

  return errors;
}

// POST /api/v1/auth/login
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const correlationId = req.correlationId;

  logger.info('Authentication attempt initiated', { correlationId, email });

  const validationErrors = validateLoginInput(email, password);
  if (validationErrors.length > 0) {
    logger.warn('Authentication rejected due to field validation error', {
      correlationId,
      email,
      validationErrors
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed on credentials submission.',
      errors: validationErrors
    });
  }

  const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase());

  if (!user) {
    logger.warn('Authentication failed: User identity not found', { correlationId, email });
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify your email/username and password.',
      code: 'AUTH_FAILED'
    });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    logger.warn('Authentication failed: Invalid password', { correlationId, userId: user.id });
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify your email/username and password.',
      code: 'AUTH_FAILED'
    });
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  logger.info('User successfully authenticated', {
    correlationId,
    userId: user.id,
    role: user.role
  });

  return res.status(200).json({
    success: true,
    token,
    user: tokenPayload
  });
});

// GET /api/v1/auth/me
app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    res.json({ success: true, user });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'HEALTHY', port: PORT, timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Auth Service listening on port ${PORT}`);
  });
}

module.exports = app;
