import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── POST /referrals ──────────────────────────────────────────────────────────
// Junior sends a referral request to an alumni
router.post(
  '/',
  requireAuth,
  [
    body('alumni_id').isUUID().withMessage('Valid alumni ID required.'),
    body('company').trim().notEmpty().withMessage('Company name required.'),
    body('role').trim().notEmpty().withMessage('Role/position required.'),
    body('message').trim().isLength({ min: 50, max: 1000 }).withMessage('Message must be 50–1000 characters.'),
    body('job_url').optional().isURL().withMessage('Invalid job URL.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Prevent alumni from requesting referrals
    const { data: requester } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user!.id)
      .single();

    if (requester?.role === 'alumni') {
      return res.status(403).json({ error: 'Alumni cannot request referrals.' });
    }

    const { alumni_id, company, role, message, job_url, resume_url } = req.body;

    const { data, error } = await supabase
      .from('referral_requests')
      .insert({
        requester_id: req.user!.id,
        alumni_id,
        company,
        role,
        message,
        job_url: job_url ?? null,
        resume_url: resume_url ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already sent a referral request to this person for this role.' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  }
);

// ─── GET /referrals/mine ──────────────────────────────────────────────────────
// Get referral requests sent BY the current student
router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('referral_requests')
    .select(`
      *,
      alumni:alumni_id (
        id, full_name, current_company, job_title, profile_picture_url
      )
    `)
    .eq('requester_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET /referrals/inbox ─────────────────────────────────────────────────────
// Get referral requests received BY the current alumni
router.get('/inbox', requireAuth, async (req: Request, res: Response) => {
  const { status } = req.query;

  let queryBuilder = supabase
    .from('referral_requests')
    .select(`
      *,
      requester:requester_id (
        id, full_name, department, batch_year, profile_picture_url, linkedin_url, skills
      )
    `)
    .eq('alumni_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (status) queryBuilder = queryBuilder.eq('status', status);

  const { data, error } = await queryBuilder;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── PATCH /referrals/:id ─────────────────────────────────────────────────────
// Alumni updates a referral request status (accept / decline / referred)
router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isUUID(),
    body('status').isIn(['accepted', 'declined', 'referred']).withMessage('Invalid status.'),
    body('alumni_notes').optional().trim().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Ensure this request belongs to the current alumni
    const { data: existing } = await supabase
      .from('referral_requests')
      .select('alumni_id')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.alumni_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this request.' });
    }

    const { data, error } = await supabase
      .from('referral_requests')
      .update({
        status: req.body.status,
        alumni_notes: req.body.alumni_notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

export default router;
