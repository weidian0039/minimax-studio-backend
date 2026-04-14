'use strict';
export {}; // Force module scope

export type IdeaStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  email: string;
  idea_text: string;
  reference_id: string;
  status: IdeaStatus;
  user_id: string | null;
  result_url: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface Job {
  id: string;
  idea_id: string;
  user_id: string | null;
  status: IdeaStatus;
  prompt: string;
  result_url: string | null;
  error_message: string | null;
  retry_count: number;
  minmax_job_id: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}
