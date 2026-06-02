import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /users/me ────────────────────────────────────────────────────────────
// Returns the authenticated user's full profile
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found.' });
  res.json(data);
});

// ─── POST /users/profile ──────────────────────────────────────────────────────
// Create or update the authenticated user's profile (onboarding)
router.post(
  '/profile',
  requireAuth,
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('role').isIn(['student', 'alumni', 'teacher']).withMessage('Role must be student, alumni, or teacher.'),
    body('department').trim().notEmpty().withMessage('Department is required.'),
    body('batch_year').isInt({ min: 2000, max: 2030 }).withMessage('Valid batch year required.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      full_name,
      role,
      department,
      batch_year,
      current_company,
      job_title,
      linkedin_url,
      bio,
      is_open_to_referrals,
      graduation_year,
      skills,
    } = req.body;

    const profileData = {
      id: req.user!.id,
      full_name,
      email: req.user!.email,
      role,
      department,
      batch_year,
      current_company: current_company ?? null,
      job_title: job_title ?? null,
      linkedin_url: linkedin_url ?? null,
      bio: bio ?? null,
      is_open_to_referrals: is_open_to_referrals ?? false,
      graduation_year: graduation_year ?? null,
      skills: skills ?? [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

// ─── GET /users/alumni ────────────────────────────────────────────────────────
// Browse alumni — filterable by dept, company, open_to_referrals
router.get('/alumni', requireAuth, async (req: Request, res: Response) => {
  const { department, company, open_to_referrals, page = '1', limit = '20' } = req.query;

  let queryBuilder = supabase
    .from('profiles')
    .select('id, full_name, department, batch_year, current_company, job_title, bio, is_open_to_referrals, profile_picture_url, linkedin_url')
    .eq('role', 'alumni')
    .order('batch_year', { ascending: false })
    .range((+page - 1) * +limit, +page * +limit - 1);

  if (department) queryBuilder = queryBuilder.eq('department', department);
  if (company) queryBuilder = queryBuilder.ilike('current_company', `%${company}%`);
  if (open_to_referrals === 'true') queryBuilder = queryBuilder.eq('is_open_to_referrals', true);

  const { data, error, count } = await queryBuilder;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ alumni: data, total: count });
});

// ─── GET /users/:id ───────────────────────────────────────────────────────────
// Get any user's public profile
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID().withMessage('Invalid user ID.')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, batch_year, current_company, job_title, bio, is_open_to_referrals, profile_picture_url, linkedin_url, role, skills')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'User not found.' });
    res.json(data);
  }
);

export default router;
