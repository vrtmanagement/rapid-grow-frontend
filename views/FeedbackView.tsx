import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { Pencil, Trash2, Send } from 'lucide-react';

interface Feedback {
  feedbackId: string;
  empId: string;
  empName?: string;
  role?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const FeedbackView: React.FC = () => {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [toDelete, setToDelete] = useState<Feedback | null>(null);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/feedback`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load feedback');
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleCreate = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }
      setItems((prev) => [data as Feedback, ...prev]);
      setDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to submit feedback');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: Feedback) => {
    const text = editDraft.trim();
    if (!text || text === item.content) {
      setEditingId(null);
      setEditDraft('');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/feedback/${item.feedbackId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update feedback');
      }
      setItems((prev) =>
        prev.map((f) => (f.feedbackId === item.feedbackId ? (data as Feedback) : f)),
      );
      setEditingId(null);
      setEditDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to update feedback');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Feedback) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/feedback/${item.feedbackId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete feedback');
      }
      setItems((prev) => prev.filter((f) => f.feedbackId !== item.feedbackId));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete feedback');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-8 bg-brand-red rounded-full" />
            <span className="text-[13px] text-slate-500 uppercase tracking-[0.2em]">
              Project Feedback
            </span>
          </div>
          <h2 className="text-3xl text-slate-900 leading-tight">Core System Feedback</h2>
          <p className="text-slate-500 text-[15px] mt-2">
            Capture all concepts and changes required for this project. Only admins can see
            and modify this feedback stream.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[13px] font-semibold text-slate-700">
            New feedback entry
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              placeholder="Describe feedback, concepts to change, or enhancements for this project..."
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !draft.trim()}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-red text-white text-[14px] font-semibold shadow-lg hover:bg-brand-navy transition-colors ${
                saving || !draft.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Send size={16} />
              {saving ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Previous feedback</h3>
          {loading && <span className="text-[12px] text-slate-400">Loading...</span>}
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-[14px] text-slate-500">
            No feedback has been submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isEditing = editingId === item.feedbackId;
              return (
                <div
                  key={item.feedbackId}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] text-slate-500 mb-1">
                        {item.empName || item.empId || 'Admin'} ·{' '}
                        <span className="uppercase tracking-[0.18em] text-[11px] text-brand-red">
                          {(item.role || '').toLowerCase()}
                        </span>
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                        />
                      ) : (
                        <div className="text-[14px] text-slate-800 whitespace-pre-wrap">
                          {item.content}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft('');
                              }}
                              className="px-3 py-1 rounded-full border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!editDraft.trim()}
                              onClick={() => handleUpdate(item)}
                              className={`px-3 py-1 rounded-full bg-brand-red text-white text-[11px] font-semibold hover:bg-brand-navy ${
                                !editDraft.trim() ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(item.feedbackId);
                                setEditDraft(item.content);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 bg-white text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete feedback</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              Are you sure you want to delete this feedback entry?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!toDelete) return;
                  handleDelete(toDelete).finally(() => setToDelete(null));
                }}
                className="px-5 py-2 rounded-full bg-brand-red text-white text-[13px] font-semibold hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackView;

