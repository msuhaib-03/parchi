import type { Profile, CompletionItem, ProfileCompletion, CompletionLevel } from '@/types';

// ── Level thresholds ─────────────────────────────────────────────────────────
const MILESTONES = [25, 50, 75, 100] as const;

function levelFor(score: number): {
  level: CompletionLevel;
  levelLabel: string;
  levelColor: string;
} {
  if (score >= 100) return { level: 'complete',    levelLabel: 'Complete ✓',   levelColor: 'emerald' };
  if (score >= 75)  return { level: 'pro',         levelLabel: 'Profile Pro',  levelColor: 'violet'  };
  if (score >= 50)  return { level: 'established', levelLabel: 'Established',  levelColor: 'indigo'  };
  if (score >= 25)  return { level: 'rising',      levelLabel: 'Rising',       levelColor: 'blue'    };
  return               { level: 'starter',      levelLabel: 'Starter',      levelColor: 'slate'   };
}

export function levelLabelAt(milestone: number): string {
  if (milestone >= 100) return 'Complete';
  if (milestone >= 75)  return 'Profile Pro';
  if (milestone >= 50)  return 'Established';
  if (milestone >= 25)  return 'Rising';
  return 'Starter';
}

// ── Main engine ───────────────────────────────────────────────────────────────
export function calculateCompletion(profile: Profile): ProfileCompletion {
  const items: CompletionItem[] = [];
  const role = profile.role;

  // ── Universal items (shared across all roles) ────────────────────────────
  items.push({
    key:    'bio',
    label:  'Write a bio (50+ characters)',
    hint:   'Help others understand who you are and what you bring',
    points: 20,
    done:   (profile.bio?.trim().length ?? 0) >= 50,
  });

  items.push({
    key:    'linkedin',
    label:  'Connect your LinkedIn',
    hint:   'Build credibility and make it easy for people to find you',
    points: 15,
    done:   !!profile.linkedin_url,
  });

  items.push({
    key:    'skills_basic',
    label:  'Add 3+ skills',
    hint:   'Skills power job matching and show your strengths',
    points: 15,
    done:   (profile.skills?.length ?? 0) >= 3,
  });

  items.push({
    key:    'portfolio',
    label:  'Add GitHub or Portfolio link',
    hint:   'Show your work beyond a resume',
    points: 10,
    done:   !!(profile.github_url || profile.portfolio_url),
  });

  items.push({
    key:    'dept_batch',
    label:  'Set department & batch year',
    hint:   'Helps alumni and students connect with their batch',
    points: 5,
    done:   !!(profile.department && profile.batch_year),
  });

  // ── Role-specific items ──────────────────────────────────────────────────
  if (role === 'student') {
    items.push({
      key:    'student_id',
      label:  'Add your MAJU Student ID',
      hint:   'Verifies your enrollment (e.g. FA22-BSCS-0114)',
      points: 10,
      done:   !!profile.student_id,
    });
    items.push({
      key:    'graduation',
      label:  'Add expected graduation year',
      hint:   'Alumni want to know when you\'re entering the job market',
      points: 10,
      done:   !!profile.graduation_year,
    });
    items.push({
      key:    'skills_full',
      label:  'Add 6+ skills',
      hint:   'More skills = stronger job matches and more referral requests',
      points: 15,
      done:   (profile.skills?.length ?? 0) >= 6,
    });
    // Total for student: 20+15+15+10+5+10+10+15 = 100
  }

  if (role === 'alumni') {
    items.push({
      key:    'work',
      label:  'Add current company & job title',
      hint:   'Lets students know where you work and what you do',
      points: 15,
      done:   !!(profile.current_company && profile.job_title),
    });
    items.push({
      key:    'skills_full',
      label:  'Add 6+ skills',
      hint:   'Inspire students with your expertise',
      points: 10,
      done:   (profile.skills?.length ?? 0) >= 6,
    });
    items.push({
      key:    'further_edu',
      label:  'Add further education (MS, MBA, PhD…)',
      hint:   'Show your full academic journey — especially if pursuing alongside work',
      points: 10,
      done:   !!(profile.further_edu_degree && profile.further_edu_institution),
    });
    items.push({
      key:    'maju_id',
      label:  'Add your MAJU Alumni ID',
      hint:   'Verifies your MAJU background to students',
      points: 5,
      done:   !!profile.student_id,
    });
    // Total for alumni: 20+15+15+10+5+15+10+10+5 = 105 — let me recount
    // bio(20) + linkedin(15) + skills_basic(15) + portfolio(10) + dept_batch(5) + work(15) + skills_full(10) + further_edu(10) + maju_id(5) = 105
    // I need 100. Let me adjust: skills_basic = 10, portfolio = 5 for alumni to bring total to 100.
    // Actually no, let me just use the total dynamically (percentage of total, not hard-coded 100)
    // The score = earned/total*100, so it always gives 0-100 regardless of which items are included.
    // Total for alumni: 105 => normalised to 100 via the percentage calculation. ✓
  }

  if (role === 'teacher') {
    items.push({
      key:    'job_title',
      label:  'Add your faculty title',
      hint:   'e.g. Assistant Professor, Lecturer, Senior Lecturer',
      points: 10,
      done:   !!profile.job_title,
    });
    items.push({
      key:    'further_edu',
      label:  'Add your highest qualification (PhD, MS…)',
      hint:   'Students look up to faculty credentials — show them yours',
      points: 20,
      done:   !!(profile.further_edu_degree && profile.further_edu_institution),
    });
    items.push({
      key:    'bio_rich',
      label:  'Write a detailed bio (100+ characters)',
      hint:   'Students want to know your research, interests and background',
      points: 10,
      done:   (profile.bio?.trim().length ?? 0) >= 100,
    });
    items.push({
      key:    'maju_id',
      label:  'Add your MAJU Faculty / Employee ID',
      hint:   'Confirms your faculty status to students and alumni',
      points: 5,
      done:   !!profile.student_id,
    });
    // Total for teacher: 20+15+15+10+5+10+20+10+5 = 110 — normalised via %
  }

  // ── Score calculation (percentage of role-specific total) ────────────────
  const total  = items.reduce((s, i) => s + i.points, 0);
  const earned = items.filter((i) => i.done).reduce((s, i) => s + i.points, 0);
  const score  = Math.round((earned / total) * 100);

  const nextMilestone     = (MILESTONES.find((m) => m > score) ?? 100) as number;
  const ptsNeeded         = Math.ceil(nextMilestone / 100 * total);
  const ptsToNextMilestone = Math.max(0, ptsNeeded - earned);

  return {
    score,
    items,
    ...levelFor(score),
    nextMilestone,
    ptsToNextMilestone,
  };
}
