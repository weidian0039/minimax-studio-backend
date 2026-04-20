'use strict';
export {}; // Force module scope

import nodemailer from 'nodemailer';
const logger = require('../logger');

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter;
let initialized = false;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (initialized) return transporter;

  if (process.env.NODEMAILER_TRANSPORT === 'mock') {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    initialized = true;
    return transporter;
  }

  const useEthereal = !process.env.EMAIL_HOST || process.env.NODEMAILER_TRANSPORT === 'test';

  if (useEthereal) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info('[Email] Using Ethereal test account', { user: testAccount.user });
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  initialized = true;
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || 'MiniMax Studio <noreply@minimax.studio>',
      to: options.to, subject: options.subject, text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>'),
    });
    if (!process.env.EMAIL_HOST || process.env.NODEMAILER_TRANSPORT === 'test') {
      logger.info('[Email] Preview URL', { url: nodemailer.getTestMessageUrl(info) });
    } else {
      logger.info('[Email] Sent', { to: options.to, messageId: info.messageId });
    }
  } catch (err) {
    logger.error('[Email] Failed to send', { to: options.to, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function sendSubmissionConfirmation(email: string, ideaText: string, referenceId: string): Promise<void> {
  await sendEmail({
    to: email, subject: 'Your idea is queued -- MiniMax Studio',
    text: `Hi there,\n\nWe've received your idea and it's now in our AI generation queue.\n\nYour idea: "${ideaText}"\nReference ID: ${referenceId}\n\nEstimated wait time: 5 minutes.\n\nWe'll email you again once your visual is ready!\n\n-- The MiniMax Studio Team`,
  });
}

export async function sendCompletionNotification(email: string, ideaText: string, resultUrl: string, referenceId: string): Promise<void> {
  await sendEmail({
    to: email, subject: 'Your idea is ready -- MiniMax Studio',
    text: `Hi there,\n\nGreat news! Your visual has been generated.\n\nYour idea: "${ideaText}"\nReference ID: ${referenceId}\n\nView your result: ${resultUrl}\n\nDownload, share, and enjoy!\n\n-- The MiniMax Studio Team`,
    html: `<p>Hi there,</p><p>Great news! Your visual has been generated.</p><p><strong>Your idea:</strong> "${ideaText}"<br/><strong>Reference ID:</strong> ${referenceId}</p><p><a href="${resultUrl}">View your result</a></p><p>Download, share, and enjoy!</p><p>-- The MiniMax Studio Team</p>`,
  });
}

export async function sendFailureNotification(email: string, ideaText: string, referenceId: string): Promise<void> {
  await sendEmail({
    to: email, subject: 'Generation failed -- MiniMax Studio',
    text: `Hi there,\n\nWe're sorry, but your visual could not be generated at this time.\n\nYour idea: "${ideaText}"\nReference ID: ${referenceId}\n\nPlease try submitting again at minimax.studio\n\n-- The MiniMax Studio Team`,
  });
}
