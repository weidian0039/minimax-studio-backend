/**
 * MiniMax Studio — API Client
 * 
 * Mock-first API layer for Phase 3 Frontend.
 * Set window.USE_MOCK_API = false to use real API.
 * 
 * Mock token stored in localStorage as 'mock_auth_token'.
 */

(function(global) {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const API_BASE = 'http://localhost:3001/api';
  const USE_MOCK = window.USE_MOCK_API === true; // default: false — set window.USE_MOCK_API=true for mock dev // default: true

  // ── Mock Data ─────────────────────────────────────────────────────────────
  const MOCK_USERS = [
    { id: 'usr_testuser001', email: 'test@example.com', password: 'password123', created_at: '2026-04-10T08:00:00Z' },
    { id: 'usr_demo002', email: 'demo@minimax.studio', password: 'demo1234', created_at: '2026-04-11T09:00:00Z' }
  ];

  const MOCK_IDEAS = [
    {
      id: 'ide_cyberpunk001',
      email: 'test@example.com',
      idea_text: '一张赛博朋克风格的城市夜景，霓虹灯光，高耸入云的摩天大楼',
      reference_id: 'MMS-CYB01A',
      status: 'completed',
      image_url: null,
      created_at: '2026-04-12T10:00:00Z',
      processed_at: '2026-04-12T10:03:00Z'
    },
    {
      id: 'ide_watercolor002',
      email: 'test@example.com',
      idea_text: '一幅水彩风格的山水风景画，云雾缭绕的中国山峦',
      reference_id: 'MMS-WTR02B',
      status: 'completed',
      image_url: null,
      created_at: '2026-04-12T11:30:00Z',
      processed_at: '2026-04-12T11:34:00Z'
    },
    {
      id: 'ide_portrait003',
      email: 'test@example.com',
      idea_text: '一位穿着汉服的年轻女性肖像，背景是古典园林',
      reference_id: 'MMS-HAN03C',
      status: 'processing',
      image_url: null,
      created_at: '2026-04-13T08:00:00Z',
      processed_at: null
    },
    {
      id: 'ide_poster004',
      email: 'test@example.com',
      idea_text: '一张极简风格的产品海报，白色背景，橙色 accent',
      reference_id: 'MMS-PST04D',
      status: 'pending',
      image_url: null,
      created_at: '2026-04-13T09:00:00Z',
      processed_at: null
    },
    {
      id: 'ide_scifi005',
      email: 'test@example.com',
      idea_text: '一个科幻风格的太空站，环绕土星环',
      reference_id: 'MMS-SPC05E',
      status: 'failed',
      image_url: null,
      created_at: '2026-04-13T07:00:00Z',
      processed_at: '2026-04-13T07:05:00Z'
    }
  ];

  // ── ApiError Class ─────────────────────────────────────────────────────────
  class ApiError extends Error {
    constructor(message, status, errorCode) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.errorCode = errorCode;
    }
  }

  // ── Helper: delay ─────────────────────────────────────────────────────────
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Helper: get token ─────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('mock_auth_token');
  }

  function setToken(token) {
    localStorage.setItem('mock_auth_token', token);
  }

  function clearToken() {
    localStorage.removeItem('mock_auth_token');
  }

  // ── Helper: real fetch wrapper ────────────────────────────────────────────
  async function realFetch(path, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + path, {
      ...options,
      headers,
      credentials: 'include' // for httpOnly cookies
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data.error || 'unknown_error'
      );
    }

    return data;
  }

  // ── Mock Implementations ──────────────────────────────────────────────────
  const mockAuth = {
    async register(email, password) {
      await delay(800);
      const existing = MOCK_USERS.find(u => u.email === email);
      if (existing) {
        const err = new ApiError('An account with this email already exists', 409, 'duplicate_email');
        throw err;
      }
      const user = {
        id: 'usr_' + Math.random().toString(36).substr(2, 12),
        email,
        created_at: new Date().toISOString()
      };
      const token = 'mock_jwt_' + Math.random().toString(36).substr(2, 24);
      setToken(token);
      return { user, token };
    },

    async login(email, password) {
      await delay(1000);
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (!user) {
        const err = new ApiError('Email or password is incorrect', 401, 'invalid_credentials');
        throw err;
      }
      const { password: _, ...safeUser } = user;
      const token = 'mock_jwt_' + Math.random().toString(36).substr(2, 24);
      setToken(token);
      return { user: safeUser, token };
    },

    async logout() {
      await delay(200);
      clearToken();
      return { success: true };
    },

    async me() {
      await delay(300);
      const token = getToken();
      if (!token) {
        throw new ApiError('Authentication required', 401, 'unauthorized');
      }
      // For mock: return the first user if we have a token
      const safeUser = { id: MOCK_USERS[0].id, email: MOCK_USERS[0].email, created_at: MOCK_USERS[0].created_at };
      return { user: safeUser };
    }
  };

  const mockIdeas = {
    async list() {
      await delay(600);
      const token = getToken();
      if (!token) throw new ApiError('Authentication required', 401, 'unauthorized');
      return {
        ideas: [...MOCK_IDEAS],
        meta: { total: MOCK_IDEAS.length, page: 1, limit: 20, total_pages: 1 }
      };
    },

    async create(idea_text) {
      await delay(800);
      const token = getToken();
      if (!token) throw new ApiError('Authentication required', 401, 'unauthorized');
      const newIdea = {
        id: 'ide_' + Math.random().toString(36).substr(2, 12),
        email: 'test@example.com',
        idea_text,
        reference_id: 'MMS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        status: 'pending',
        image_url: null,
        created_at: new Date().toISOString(),
        processed_at: null
      };
      MOCK_IDEAS.unshift(newIdea);
      return { id: newIdea.id, referenceId: newIdea.reference_id, status: 'pending', estimated_wait_minutes: 5 };
    },

    async getById(id) {
      await delay(400);
      const token = getToken();
      if (!token) throw new ApiError('Authentication required', 401, 'unauthorized');
      const idea = MOCK_IDEAS.find(i => i.id === id);
      if (!idea) throw new ApiError('Idea not found', 404, 'not_found');
      return idea;
    }
  };

  const mockDashboard = {
    async getStats() {
      await delay(500);
      const token = getToken();
      if (!token) throw new ApiError('Authentication required', 401, 'unauthorized');
      const stats = { total: MOCK_IDEAS.length, pending: 0, processing: 0, completed: 0, failed: 0 };
      MOCK_IDEAS.forEach(i => stats[i.status]++);
      return {
        stats: {
          total_ideas: stats.total,
          pending: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          failed: stats.failed
        },
        recent_ideas: MOCK_IDEAS.slice(0, 5)
      };
    }
  };

  // ── Real API Implementations ───────────────────────────────────────────────
  const realAuth = {
    async register(email, password) {
      return realFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    async login(email, password) {
      const data = await realFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) setToken(data.token);
      return data;
    },
    async logout() {
      try {
        await realFetch('/auth/logout', { method: 'POST' });
      } finally {
        clearToken();
        return { success: true };
      }
    },
    async me() {
      return realFetch('/auth/me');
    }
  };

  const realIdeas = {
    async list() {
      return realFetch('/ideas');
    },
    async create(idea_text) {
      return realFetch('/ideas', {
        method: 'POST',
        body: JSON.stringify({ idea_text })
      });
    },
    async getById(id) {
      return realFetch(`/ideas/${id}`);
    }
  };

  const realDashboard = {
    async getStats() {
      return realFetch('/dashboard/stats');
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────
  const api = {
    auth: USE_MOCK ? mockAuth : realAuth,
    ideas: USE_MOCK ? mockIdeas : realIdeas,
    dashboard: USE_MOCK ? mockDashboard : realDashboard,
    ApiError,
    USE_MOCK
  };

  // Attach to window
  global.API = api;
  global.ApiError = ApiError;

})(typeof window !== 'undefined' ? window : this);
