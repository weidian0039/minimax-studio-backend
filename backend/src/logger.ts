'use strict';
export {}; // Force module scope

// Structured logging with Winston
// - Console: dev = colorized human-readable, prod = plain JSON
// - File logs: always clean JSON (no ANSI codes), ISO timestamps, daily rotation
//
// IMPORTANT: colorize() modifies log object fields in-place (adds ANSI to level/message).
// To prevent ANSI leaking into JSON file logs, colorize is applied ONLY to the Console
// transport via its own format — NOT to the parent logger's base format.

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

const isProd = process.env.NODE_ENV === 'production';

// Dev console format: colorized text
const devConsoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}`;
  })
);

// Prod console / all file logs: clean JSON, ISO timestamp
const jsonFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json()
);

const LOG_DIR = process.env.LOG_DIR || 'logs';

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  // Parent format: plain (no colorize) — child transports override as needed
  format: isProd ? jsonFormat : combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ level, message, timestamp: ts, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${ts}] ${level}: ${message}${metaStr}`;
    })
  ),
  transports: [
    // Console: dev=colorized, prod=JSON
    new winston.transports.Console({
      format: isProd ? jsonFormat : devConsoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    // File: always clean JSON, daily rotation, 14-day retention, 10MB max
    new DailyRotateFile({
      filename: `${LOG_DIR}/app-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      format: jsonFormat,
      level: 'info',
      handleExceptions: true,
      handleRejections: true,
    }),
    new DailyRotateFile({
      filename: `${LOG_DIR}/app-%DATE%-error.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      format: jsonFormat,
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Global exception handlers in production
if (isProd) {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
  });
}

module.exports = logger;
