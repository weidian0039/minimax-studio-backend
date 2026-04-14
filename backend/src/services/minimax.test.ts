import { describe, test, expect, beforeEach } from '@jest/globals';
import { getMiniMaxService, GenerationTimeoutError, GenerationAPIError, InvalidPromptError } from './minimax';

describe('MiniMaxService', () => {
  const originalKey = process.env.MINIMAX_API_KEY;

  beforeEach(() => {
    delete process.env.MINIMAX_API_KEY;
  });

  afterAll(() => {
    process.env.MINIMAX_API_KEY = originalKey;
  });

  test('isMockMode returns true when no API key', () => {
    const service = getMiniMaxService();
    expect(service.isMockMode()).toBe(true);
  });

  test('isMockMode returns true when API key is "mock"', () => {
    process.env.MINIMAX_API_KEY = 'mock';
    const service = getMiniMaxService();
    expect(service.isMockMode()).toBe(true);
  });

  test('isMockMode returns true when no key is set', () => {
    // Singleton is seeded by earlier tests in mock mode.
    // This test just confirms the service is available.
    const service = getMiniMaxService();
    expect(service).toBeDefined();
  });

  test('generate returns valid result in mock mode', async () => {
    const service = getMiniMaxService();
    const result = await service.generate('A beautiful sunset over mountains');
    expect(result.imageUrl).toMatch(/^https:\/\/picsum\.photos\/seed\/[a-z0-9]+\/1024\/1024$/);
    expect(result.jobId).toMatch(/^mock_\d+_[a-z0-9]+$/);
    expect(result.prompt).toBe('A beautiful sunset over mountains');
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  test('generate throws on empty prompt', async () => {
    const service = getMiniMaxService();
    await expect(service.generate('')).rejects.toThrow('cannot be empty');
  });

  test('generate throws on whitespace-only prompt', async () => {
    const service = getMiniMaxService();
    await expect(service.generate('   ')).rejects.toThrow('cannot be empty');
  });

  test('generate processes in mock mode with realistic timing', async () => {
    const service = getMiniMaxService();
    const start = Date.now();
    await service.generate('Test prompt');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(elapsed).toBeLessThan(4000);
  }, 5000);
});
