import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /messages/conversations ─────────────────────────────────────────────
// Get a list of all conversations for the current user
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Get latest message per conversation partner
  const { data, error } = await supabase.rpc('get_conversations', { user_id: userId });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /messages/:otherId ───────────────────────────────────────────────────
// Get the full message thread between current user and another user
router.get(
  '/:otherId',
  requireAuth,
  [param('otherId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user!.id;
    const otherId = req.params.otherId;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, full_name, profile_picture_url)
      `)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Mark messages from the other person as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    res.json(data);
  }
);

// ─── POST /messages ───────────────────────────────────────────────────────────
// Send a new message
router.post(
  '/',
  requireAuth,
  [
    body('receiver_id').isUUID().withMessage('Valid receiver ID required.'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 characters.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Can't message yourself
    if (req.body.receiver_id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot send a message to yourself.' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: req.user!.id,
        receiver_id: req.body.receiver_id,
        content: req.body.content,
      })
      .select(`
        *,
        sender:sender_id (id, full_name, profile_picture_url)
      `)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  }
);

// ─── GET /messages/unread/count ───────────────────────────────────────────────
// Get the count of unread messages for current user
router.get('/unread/count', requireAuth, async (req: Request, res: Response) => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', req.user!.id)
    .eq('is_read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ unread: count ?? 0 });
});

export default router;
