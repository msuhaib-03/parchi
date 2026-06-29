'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  SALARY_ROLE_LEVELS, SALARY_EXP_RANGES, SALARY_LOCATIONS, DEPARTMENTS,
  fmtPKR,
} from '@/types';
import type { SalaryRoleLevel, SalaryExpRange, SalaryLocation, SalaryEmployment } from '@/types';

const inputCls =
  'w-full py-2.5 px-4 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(String);

const EMPLOYMENT_TYPES: { value: SalaryEmployment; label: string }[] = [
  { value: 'full-time',  label: 'Full-time'  },
  { value: 'part-time',  label: 'Part-time'  },
  { value: 'contract',   label: 'Contract'   },
  { value: 'freelance',  label: 'Freelance'  },
];

export default function SalarySubmitPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [userId,   setUserId]   = useState('');
  const [existing, setExisting] = useState<{ id: string } | null>(null);

  const [form, setForm] = useState({
    role_title:         '',
    company:            '',
    location:           'Karachi' as SalaryLocation,
    experience_range:   '1-2' as SalaryExpRange,
    role_level:         'junior' as SalaryRoleLevel,
    employment_type:    'full-time' as SalaryEmployment,
    monthly_salary_pkr: '',
    department:         '',
    year_of_data:       CURRENT_YEAR.toString(),
    tags:               '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: row } = await supabase
        .from('salary_entries')
        .select('id, role_title, company, location, experience_range, role_level, employment_type, monthly_salary_pkr, department, year_of_data, tags')
        .eq('submitted_by', user.id)
        .eq('year_of_data', CURRENT_YEAR)
        .maybeSingle();

      if (row) {
        setExisting({ id: row.id });
        setForm({
          role_title:         row.role_title ?? '',
          company:            row.company ?? '',
          location:           (row.location as SalaryLocation) ?? 'Karachi',
          experience_range:   (row.experience_range as SalaryExpRange) ?? '1-2',
          role_level:         (row.role_level as SalaryRoleLevel) ?? 'junior',
          employment_type:    (row.employment_type as SalaryEmployment) ?? 'full-time',
          monthly_salary_pkr: row.monthly_salary_pkr?.toString() ?? '',
          department:         row.department ?? '',
          year_of_data:       row.year_of_data?.toString() ?? CURRENT_YEAR.toString(),
          tags:               (row.tags ?? []).join(', '),
        });
      }

      setLoading(false);
    })();
  }, [supabase, router]);

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const salaryNum = parseInt(form.monthly_salary_pkr, 10);
  const salaryPreview = !isNaN(salaryNum) && salaryNum > 0 ? fmtPKR(salaryNum) + '/mo' : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const salary = parseInt(form.monthly_salary_pkr, 10);
    if (!form.role_title.trim()) { toast.error('Role title is required.'); return; }
    if (!form.company.trim())    { toast.error('Company is required.'); return; }
    if (isNaN(salary) || salary < 10000) { toast.error('Monthly salary must be at least PKR 10,000.'); return; }
    if (salary > 5000000)                { toast.error('Salary seems too high — max 5,000,000 PKR/mo.'); return; }

    setSaving(true);

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      submitted_by:       userId,
      role_title:         form.role_title.trim(),
      company:            form.company.trim(),
      location:           form.location,
      experience_range:   form.experience_range,
      role_level:         form.role_level,
      employment_type:    form.employment_type,
      monthly_salary_pkr: salary,
      department:         form.department || null,
      year_of_data:       parseInt(form.year_of_data, 10),
      tags:               tags.length > 0 ? tags : null,
      updated_at:         new Date().toISOString(),
    };

    const { error } = await supabase
      .from('salary_entries')
      .upsert(payload, { onConflict: 'submitted_by,year_of_data' });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(existing ? 'Salary updated. Thanks for keeping it fresh!' : 'Salary added. Thanks for helping the community!');
    router.push('/salary');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link href="/salary" className="text-sm text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
            ← Back to Salary Insights
          </Link>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp size={20} className="text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              {existing ? 'Update Your Salary' : 'Add Your Salary'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Shield size={12} />
            <span>100% anonymous · your name is never stored with this data</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Role title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Role / Job Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.role_title}
                onChange={f('role_title')}
                placeholder="e.g. Software Engineer, Data Analyst, PM"
                required
                className={inputCls}
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Company <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={f('company')}
                placeholder="e.g. Systems Limited, Netsol, Gaditek"
                required
                className={inputCls}
              />
            </div>

            {/* Role level + Experience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Level</label>
                <select value={form.role_level} onChange={f('role_level')} className={inputCls}>
                  {SALARY_ROLE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Experience (years)</label>
                <select value={form.experience_range} onChange={f('experience_range')} className={inputCls}>
                  {SALARY_EXP_RANGES.map((r) => (
                    <option key={r} value={r}>{r} yrs</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location + Employment type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Location</label>
                <select value={form.location} onChange={f('location')} className={inputCls}>
                  {SALARY_LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Employment type</label>
                <select value={form.employment_type} onChange={f('employment_type')} className={inputCls}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Monthly Salary (PKR gross) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 dark:text-zinc-500 select-none">PKR</span>
                <input
                  type="number"
                  value={form.monthly_salary_pkr}
                  onChange={f('monthly_salary_pkr')}
                  placeholder="e.g. 150000"
                  min={10000}
                  max={5000000}
                  required
                  className={`${inputCls} pl-14`}
                />
              </div>
              {salaryPreview && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{salaryPreview}</p>
              )}
            </div>

            {/* Year of data */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Year this salary is from
              </label>
              <select value={form.year_of_data} onChange={f('year_of_data')} className={inputCls}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Department (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Your MAJU department <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">(optional — helps by major)</span>
              </label>
              <select value={form.department} onChange={f('department')} className={inputCls}>
                <option value="">— skip —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Tech stack / skills <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={f('tags')}
                placeholder="e.g. React, Python, SQL, AWS"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Saving…' : existing ? 'Update salary' : 'Submit anonymously'}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-zinc-500">
              You can update this once per year. Data is fully anonymous.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
