'use strict';
export {}; // Force module scope

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_IDEA_LENGTH = 5;
const MAX_IDEA_LENGTH = 500;
const MAX_EMAIL_LENGTH = 255;

export function validateIdeaSubmission(body: { email?: string; idea_text?: string; idea?: string }) {
  const errors: Array<{ field: string; message: string }> = [];

  if (!body.email) errors.push({ field: 'email', message: 'Email is required' });
  else if (body.email.length > MAX_EMAIL_LENGTH) errors.push({ field: 'email', message: 'Email too long' });
  else if (!EMAIL_REGEX.test(body.email.trim())) errors.push({ field: 'email', message: 'Invalid email format' });

  const idea = body.idea_text ?? body.idea;
  if (!idea) errors.push({ field: 'idea', message: 'Idea is required' });
  else if (idea.trim().length < MIN_IDEA_LENGTH) errors.push({ field: 'idea', message: 'Idea too short' });
  else if (idea.length > MAX_IDEA_LENGTH) errors.push({ field: 'idea', message: 'Idea too long' });

  return { valid: errors.length === 0, errors };
}
