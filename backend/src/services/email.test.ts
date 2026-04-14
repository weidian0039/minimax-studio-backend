import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  sendSubmissionConfirmation,
  sendCompletionNotification,
  sendFailureNotification,
} from './email';

describe('Email Service', () => {
  beforeEach(() => {
    process.env.NODEMAILER_TRANSPORT = 'test';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODEMAILER_TRANSPORT;
    delete process.env.NODE_ENV;
  });

  test('sendSubmissionConfirmation does not throw', async () => {
    await expect(
      sendSubmissionConfirmation('test@example.com', 'A creative idea', 'MMS-TEST01')
    ).resolves.not.toThrow();
  });

  test('sendCompletionNotification does not throw', async () => {
    await expect(
      sendCompletionNotification(
        'user@example.com',
        'A visual concept',
        'https://example.com/result.jpg',
        'MMS-READY42'
      )
    ).resolves.not.toThrow();
  });

  test('sendFailureNotification does not throw', async () => {
    await expect(
      sendFailureNotification(
        'fail@example.com',
        'An idea that failed',
        'MMS-FAIL999'
      )
    ).resolves.not.toThrow();
  });
});
