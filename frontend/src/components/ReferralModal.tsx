'use client';

import { useState } from 'react';
import { X, Loader2, Briefcase, Link2, FileText } from 'lucide-react';
import { referralsApi } from '@/lib/api';
import type { Profile } from '@/types';

interface ReferralModalProps {
  alumni: Profile;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReferralModal({ alumni, onClose, onSuccess }: ReferralModalProps) {
  const [form, setForm] = useState({ company: alumni.current_company ?? '', role: '', job_url: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.message.length < 50) {
      setError('Your message needs to be at least 50 characters. Tell them why you want to join their company.');
      return;
    }

    setLoading(true);
    try {
      await referralsApi.send(alumni.id, {
        company: form.company,
        role: form.role,
        job_url: form.job_url || undefined,
        message: form.message,
      });
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {alumni.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Request referral</h2>
              <p className="text-xs text-gray-500">from {alumni.full_name} · {alumni.current_company}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
            <div className="relative">
              <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
                placeholder="e.g. Systems Limited"
                required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Position</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              placeholder="e.g. Junior Software Engineer"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Job URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Posting URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={form.job_url}
                onChange={(e) => update('job_url', e.target.value)}
                placeholder="https://linkedin.com/jobs/..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your message
              <span className={`ml-2 text-xs font-normal ${form.message.length < 50 ? 'text-red-400' : 'text-green-500'}`}>
                ({form.message.length}/1000, min 50)
              </span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              placeholder="Hi! I'm a MAJU CS student graduating this semester. I've been working with React and Node.js and I'd love to apply for this role at your company. Could you help me get referred? I believe..."
              required
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 Tip: Be genuine. Mention your relevant skills and why you're excited about this role.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Sending...' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
