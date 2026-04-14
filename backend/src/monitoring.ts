'use strict';
export {}; // Force module scope
const Sentry = require('@sentry/node');
const logger = require('./logger');

function initMonitoring() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn === 'https://your_dsn@sentry.io/project') {
    logger.warn('[Monitoring] SENTRY_DSN not configured');
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request && event.request.url) {
        const url = event.request.url;
        if (url.endsWith('/health') || url.endsWith('/healthz') || url === '/') {
          return null;
        }
      }
      return event;
    },
    ignoreErrors: ['Non-Error promise rejection captured'],
  });
  logger.info(`[Monitoring] Sentry initialized -- environment: ${process.env.NODE_ENV}`);
}

function requestHandler() {
  return Sentry.Handlers.requestHandler({ transaction: 'request' });
}

function errorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error: any) {
      return !error.statusCode || error.statusCode >= 500;
    },
  });
}

function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error: Error) => {
    logger.error('[FATAL] Uncaught Exception', { error: error.message, stack: error.stack });
    Sentry.captureException(error, { level: 'fatal' });
    setTimeout(() => process.exit(1), 2000);
  });
  process.on('unhandledRejection', (reason: any) => {
    logger.error('[FATAL] Unhandled Rejection:', { reason: String(reason) });
    if (reason instanceof Error) Sentry.captureException(reason);
    else Sentry.captureMessage(`Unhandled: ${String(reason)}`);
  });
}

module.exports = { initMonitoring, requestHandler, errorHandler, setupGlobalErrorHandlers };
