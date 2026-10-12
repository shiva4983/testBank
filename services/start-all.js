/**
 * FinApex Microservices All-in-One Orchestrator
 * Starts Auth Service (5001), Account Service (5002), Transaction Service (5003),
 * and API Gateway (5000) concurrently.
 */

const authApp = require('./auth-service');
const accountApp = require('./account-service');
const transactionApp = require('./transaction-service');
const gatewayApp = require('./gateway');

const AUTH_PORT = 9001;
const ACCOUNT_PORT = 9002;
const TRANSACTION_PORT = 9003;
const GATEWAY_PORT = 9000;

authApp.listen(AUTH_PORT, () => {
  console.log(`[AUTH-SERVICE]        ✅ Online on port ${AUTH_PORT}`);
});

accountApp.listen(ACCOUNT_PORT, () => {
  console.log(`[ACCOUNT-SERVICE]     ✅ Online on port ${ACCOUNT_PORT}`);
});

transactionApp.listen(TRANSACTION_PORT, () => {
  console.log(`[TRANSACTION-SERVICE] ✅ Online on port ${TRANSACTION_PORT}`);
});

gatewayApp.listen(GATEWAY_PORT, () => {
  console.log(`[API-GATEWAY]         🚀 Online on port ${GATEWAY_PORT}`);
  console.log(`=======================================================`);
  console.log(`📚 Swagger Documentation : http://localhost:${GATEWAY_PORT}/api-docs`);
  console.log(`🩺 Gateway Healthcheck   : http://localhost:${GATEWAY_PORT}/health`);
  console.log(`=======================================================`);
});
