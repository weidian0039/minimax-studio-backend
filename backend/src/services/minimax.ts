'use strict';
const logger = require('../logger');

export {}; // Force module scope

const MINI_MAX_API_URL = 'https://api.minimax.chat/v1';
const POLL_INTERVAL_MS = 5000;
const GENERATION_TIMEOUT_MS = 120000;

export interface MiniMaxResult {
  imageUrl: string;
  jobId: string;
  prompt: string;
  processingTimeMs: number;
}

export class GenerationTimeoutError extends Error {
  constructor() {
    super('MiniMax generation timed out after 120 seconds');
    this.name = 'GenerationTimeoutError';
  }
}

export class GenerationAPIError extends Error {
  statusCode: number;
  responseBody: string;
  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = 'GenerationAPIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class InvalidPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPromptError';
  }
}

class MiniMaxService {
  private apiKey: string;
  private mockMode: boolean;

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.mockMode = !this.apiKey || this.apiKey === 'mock';
    if (this.mockMode) {
      logger.info('[MiniMax] Running in MOCK mode -- set MINIMAX_API_KEY in .env to use real API');
    } else {
      logger.info('[MiniMax] Running in LIVE mode with real API');
    }
  }

  isMockMode(): boolean { return this.mockMode; }

  async generate(prompt: string): Promise<MiniMaxResult> {
    if (!prompt || prompt.trim().length === 0) {
      throw new InvalidPromptError('Prompt cannot be empty');
    }
    return this.mockMode ? this.mockGenerate(prompt) : this.realGenerate(prompt);
  }

  private async mockGenerate(prompt: string): Promise<MiniMaxResult> {
    const start = Date.now();
    const delay = 1000 + Math.random() * 2000;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    const seed = Math.random().toString(36).substring(2, 10);
    const imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
    const jobId = `mock_${Date.now()}_${seed}`;
    logger.info(`[MiniMax Mock] Generated image for prompt: "${prompt.substring(0, 50)}..." -> ${imageUrl}`);
    return { imageUrl, jobId, prompt, processingTimeMs: Date.now() - start };
  }

  private async realGenerate(prompt: string): Promise<MiniMaxResult> {
    const start = Date.now();
    const submitResponse = await fetch(`${MINI_MAX_API_URL}/images/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'MiniMax-Image-01', prompt }),
    });

    if (!submitResponse.ok) {
      const body = await submitResponse.text();
      throw new GenerationAPIError(`MiniMax API error: ${submitResponse.status}`, submitResponse.status, body);
    }

    const submitData = (await submitResponse.json()) as { job_id?: string };
    const jobId = submitData.job_id || '';
    const deadline = start + GENERATION_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollResponse = await fetch(`${MINI_MAX_API_URL}/images/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!pollResponse.ok) {
        const body = await pollResponse.text();
        throw new GenerationAPIError(`MiniMax poll error: ${pollResponse.status}`, pollResponse.status, body);
      }

      const pollData = (await pollResponse.json()) as {
        status?: string;
        image_url?: string;
        images?: Array<{ url: string }>;
      };

      if (pollData.status === 'completed') {
        const imageUrl = pollData.image_url || pollData.images?.[0]?.url || '';
        return { imageUrl, jobId, prompt, processingTimeMs: Date.now() - start };
      }
      if (pollData.status === 'failed') {
        throw new GenerationAPIError('Generation failed on MiniMax side', 500, JSON.stringify(pollData));
      }
    }
    throw new GenerationTimeoutError();
  }
}

let serviceInstance: MiniMaxService | null = null;

export function getMiniMaxService(): MiniMaxService {
  if (!serviceInstance) serviceInstance = new MiniMaxService();
  return serviceInstance;
}
export type { MiniMaxService };
