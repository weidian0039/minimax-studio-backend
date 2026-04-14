import { describe, test, expect } from '@jest/globals';
import { validateIdeaSubmission } from './validation';

describe('validateIdeaSubmission', () => {
  test('valid submission passes', () => {
    const result = validateIdeaSubmission({
      email: 'user@example.com',
      idea_text: 'A beautiful sunset over the ocean',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing email fails', () => {
    const result = validateIdeaSubmission({ idea_text: 'Some idea' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'email')).toBe(true);
  });

  test('invalid email format fails', () => {
    const result = validateIdeaSubmission({
      email: 'not-an-email',
      idea_text: 'A beautiful idea',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'email')).toBe(true);
  });

  test('idea too short fails', () => {
    const result = validateIdeaSubmission({
      email: 'user@example.com',
      idea_text: 'Hi',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'idea')).toBe(true);
  });

  test('idea too long fails', () => {
    const result = validateIdeaSubmission({
      email: 'user@example.com',
      idea_text: 'A'.repeat(501),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'idea' && e.message.includes('too long'))).toBe(true);
  });

  test('accepts idea field (backward compat)', () => {
    const result = validateIdeaSubmission({
      email: 'user@example.com',
      idea: 'A backward compatible idea submission',
    });
    expect(result.valid).toBe(true);
  });
});
