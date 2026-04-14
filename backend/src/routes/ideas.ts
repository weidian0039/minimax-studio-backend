'use strict';
const logger = require('../logger');

export {}; // Force module scope

import { Router, Request, Response } from 'express';
import { createIdea, getIdeaById, getIdeaByReferenceId } from '../db/index';
import { requireAuth } from '../middleware/auth';
import { validateIdeaSubmission } from '../validation';
import { enqueueJob } from '../queue';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: Request, res: Response) => {
  const { idea_text, idea, reference_id } = req.body as { idea_text?: string; idea?: string; reference_id?: string };
  const ideaValue = idea_text ?? idea;
  const userId = req.user ? req.user.userId : undefined;
  const email = req.user ? req.user.email : undefined;

  // Validate idea text only — email comes from authenticated JWT, not client body
  const { valid, errors } = validateIdeaSubmission({ email, idea_text: ideaValue, idea: undefined });
  if (!valid) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Request validation failed', details: errors });
    return;
  }

  if (!email) {
    res.status(401).json({ success: false, error: 'unauthorized', message: 'Authenticated user email not found.' });
    return;
  }

  try {
    const ideaData = { email: email.trim(), idea_text: ideaValue!.trim(), userId: userId ?? null };
    const { id, referenceId } = await createIdea(ideaData);
    enqueueJob({ id, reference_id: referenceId ?? reference_id ?? '', email: email.trim(), idea_text: ideaValue!.trim() }, userId)
      .catch((err: Error) => { logger.error('[Ideas] Failed to enqueue', { error: err instanceof Error ? err.message : String(err) }); });
    res.status(201).json({ success: true, data: { status: 'queued', id, referenceId, estimated_wait_minutes: 5 } });
  } catch (err) {
    logger.error('[Ideas] Failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'An unexpected error occurred.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || !id.startsWith('ide_')) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Invalid idea ID format' });
    return;
  }
  try {
    const idea = await getIdeaById(id);
    if (!idea) { res.status(404).json({ success: false, error: 'not_found', message: 'Idea not found' }); return; }
    if (idea.user_id && idea.user_id !== req.user?.userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'forbidden', message: 'Permission denied' }); return;
    }
    res.status(200).json({ success: true, data: { id: idea.id, email: idea.email, idea_text: idea.idea_text, reference_id: idea.reference_id, status: idea.status, result_url: idea.result_url || null, created_at: idea.created_at, processed_at: idea.processed_at || null } });
  } catch (err) {
    logger.error('[Ideas] Fetch error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'An unexpected error occurred.' });
  }
});

router.get('/reference/:ref', async (req: Request, res: Response) => {
  const { ref } = req.params;
  if (!ref || !/^MMS-[A-Z0-9]{6}$/.test(ref)) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Invalid reference ID format. Expected MMS-XXXXXX.' });
    return;
  }
  try {
    const idea = await getIdeaByReferenceId(ref);
    if (!idea) { res.status(404).json({ success: false, error: 'not_found', message: 'Idea not found' }); return; }
    if (idea.user_id && idea.user_id !== req.user?.userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'forbidden', message: 'Permission denied' }); return;
    }
    res.status(200).json({ success: true, data: { id: idea.id, email: idea.email, idea_text: idea.idea_text, reference_id: idea.reference_id, status: idea.status, result_url: idea.result_url || null, created_at: idea.created_at, processed_at: idea.processed_at || null } });
  } catch (err) {
    logger.error('[Ideas] Fetch by ref error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'An unexpected error occurred.' });
  }
});

export default router;
