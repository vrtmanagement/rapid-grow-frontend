import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { apiCreateContent, apiDeleteContent, apiListContent, apiUpdateContent, apiUploadContentFile, ContentAsset, ContentItem, ContentType } from '../services/contentApi';
import { apiListUsers } from '../communication/api';
import Toast from '../components/ui/Toast';

const TYPE_LABEL: Record<ContentType, string> = {
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  general: 'General',
  newsletter: 'Mail',
  website: 'Website',
};

function getCurrentRole() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return '';
    return String(JSON.parse(raw)?.employee?.role || '');
  } catch {
    return '';
  }
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEK_DAY_HEADER_CLASS = [
  'bg-blue-50 text-blue-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-fuchsia-50 text-fuchsia-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';
type ContentTab = 'calendar' | 'follow-ee' | 'follow-ega' | 'auto-add';

function getInitialTab(search: string): ContentTab {
  const tab = String(new URLSearchParams(search).get('tab') || '').trim().toLowerCase();
  if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add') return tab;
  return 'calendar';
}

function nameInitials(name: string) {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function renderStyledDescription(text: string) {
  const value = String(text || '').trim();
  if (!value) return 'No description';
  const parts = value.split(/(\s+)/);
  return parts.map((part, index) => {
    if (/^https?:\/\/\S+$/i.test(part)) {
      return (
        <a
          key={`part-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {part}
        </a>
      );
    }
    if (/^#[^\s#]+$/.test(part)) {
      return (
        <strong key={`part-${index}`} className="font-semibold text-slate-800">
          {part}
        </strong>
      );
    }
    return <React.Fragment key={`part-${index}`}>{part}</React.Fragment>;
  });
}

function readStringList(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const ContentView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dayKey } = useParams();
  const isDayPage = !!dayKey;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const canManage = useMemo(() => role === 'ADMIN' || role === 'TEAM_LEAD' || role === 'SUPER_ADMIN', [role]);
  const [activeTab, setActiveTab] = useState<ContentTab>(() => getInitialTab(location.search));

  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));

  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ContentType>('general');
  const [contentDate, setContentDate] = useState<string>(toDateKey(new Date()));
  const [attachments, setAttachments] = useState<ContentAsset[]>([]);
  const [userAvatarByEmpId, setUserAvatarByEmpId] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [linkOptions, setLinkOptions] = useState<string[]>(() => readStringList(LINK_STORAGE_KEY));
  const [tagOptions, setTagOptions] = useState<string[]>(() => readStringList(TAG_STORAGE_KEY));
  const [newLinkValue, setNewLinkValue] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const contentRes = await apiListContent();
      setItems(Array.isArray(contentRes.items) ? contentRes.items : []);
      setRole(getCurrentRole());
    } catch (err: any) {
      setError(err.message || 'Unable to load content');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    let disposed = false;
    async function loadProfiles() {
      try {
        const data = await apiListUsers();
        if (disposed) return;
        const next: Record<string, string> = {};
        (data.users || []).forEach((user: any) => {
          const empId = String(user.empId || user.id || user.userId || '').trim();
          if (!empId) return;
          if (typeof user.avatar === 'string' && user.avatar.trim()) {
            next[empId] = user.avatar.trim();
          }
        });
        setUserAvatarByEmpId(next);
      } catch {
        // Keep fallback initials when profile API is unavailable.
      }
    }
    loadProfiles();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      setSelectedDate(dayKey);
      const parsed = new Date(`${dayKey}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [dayKey]);

  useEffect(() => {
    setActiveTab(getInitialTab(location.search));
  }, [location.search]);

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const firstWeekdayMon = (firstOfMonth.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < firstWeekdayMon; i += 1) days.push(null);
    for (let day = 1; day <= lastOfMonth.getDate(); day += 1) days.push(new Date(year, month, day));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthCursor]);

  const calendarItems = useMemo(
    () => items.filter((item) => {
      const key = String(item.channelKey || '').toLowerCase();
      return key !== 'follow-ee' && key !== 'follow-ega';
    }),
    [items]
  );
  const countsByDate = useMemo(() => {
    const map = new Map<string, Record<ContentType, number>>();
    for (const item of calendarItems) {
      const key = item.contentDate || (item.createdAt ? item.createdAt.slice(0, 10) : '');
      if (!key) continue;
      const row = map.get(key) || { linkedin: 0, youtube: 0, general: 0, newsletter: 0, website: 0 };
      row[item.type] = (row[item.type] || 0) + 1;
      map.set(key, row);
    }
    return map;
  }, [calendarItems]);

  const selectedDayItems = useMemo(
    () => calendarItems.filter((item) => (item.contentDate || item.createdAt?.slice(0, 10)) === selectedDate),
    [calendarItems, selectedDate]
  );
  const followEeItems = useMemo(
    () => items.filter((item) => String(item.channelKey || '').toLowerCase() === 'follow-ee'),
    [items]
  );
  const followEgaItems = useMemo(
    () => items.filter((item) => String(item.channelKey || '').toLowerCase() === 'follow-ega'),
    [items]
  );

  const activeReminderItems = activeTab === 'follow-ee' ? followEeItems : followEgaItems;

  const openCreatePage = (day?: string) => {
    const date = day || selectedDate || toDateKey(new Date());
    const mode = activeTab === 'follow-ee' ? 'follow-ee' : activeTab === 'follow-ega' ? 'follow-ega' : 'calendar';
    navigate(`/content/new?date=${encodeURIComponent(date)}&mode=${encodeURIComponent(mode)}`);
  };

  const handleTabChange = (tab: ContentTab) => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      navigate('/content');
      return;
    }
    if (tab === 'follow-ee' || tab === 'follow-ega' || tab === 'auto-add') {
      navigate(`/content?tab=${encodeURIComponent(tab)}`);
    }
  };

  const persistAutoOptions = (links: string[], tags: string[]) => {
    setLinkOptions(links);
    setTagOptions(tags);
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
  };

  const addAutoLink = () => {
    const value = newLinkValue.trim();
    if (!value) return;
    persistAutoOptions(Array.from(new Set([...linkOptions, value])), tagOptions);
    setNewLinkValue('');
    setToast({ message: 'Link added to auto list.', type: 'success' });
  };

  const addAutoTag = () => {
    const value = newTagValue.trim();
    if (!value) return;
    const normalized = value.startsWith('#') ? value : `#${value}`;
    persistAutoOptions(linkOptions, Array.from(new Set([...tagOptions, normalized])));
    setNewTagValue('');
    setToast({ message: 'Tag added to auto list.', type: 'success' });
  };

  const removeAutoLink = (value: string) => {
    persistAutoOptions(linkOptions.filter((entry) => entry !== value), tagOptions);
  };

  const removeAutoTag = (value: string) => {
    persistAutoOptions(linkOptions, tagOptions.filter((entry) => entry !== value));
  };

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setType(item.type);
    setContentDate(item.contentDate || item.createdAt.slice(0, 10));
    setAttachments(Array.isArray(item.attachments) ? item.attachments : []);
    setShowModal(true);
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => apiUploadContentFile(file)));
      setAttachments((prev) => [...prev, ...uploads]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Title is required');
    if (!contentDate) return setError('Date is required');
    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        const updated = await apiUpdateContent(editingItem.contentId, {
          title: title.trim(),
          description: description.trim(),
          type,
          contentDate,
          attachments,
        });
        setItems((prev) => prev.map((entry) => (entry.contentId === editingItem.contentId ? updated.item : entry)));
        setToast({ message: 'Content updated successfully.', type: 'success' });
      } else {
        const created = await apiCreateContent({
          title: title.trim(),
          description: description.trim(),
          type,
          contentDate,
          channelKey: type,
          coverImage: null,
          attachments,
        });
        setItems((prev) => [created.item, ...prev]);
        setToast({ message: 'Content created successfully.', type: 'success' });
      }
      setSelectedDate(contentDate);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save content');
      setToast({ message: err.message || 'Failed to save content', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    try {
      await apiDeleteContent(contentId);
      setItems((prev) => prev.filter((entry) => entry.contentId !== contentId));
      setToast({ message: 'Content deleted successfully.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete content');
      setToast({ message: err.message || 'Failed to delete content', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleTabChange('calendar')} className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'calendar' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}>Calendar</button>
          <button type="button" onClick={() => handleTabChange('follow-ee')} className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'follow-ee' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Follow Reminder EE</button>
          <button type="button" onClick={() => handleTabChange('follow-ega')} className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'follow-ega' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>Follow Reminder EGA</button>
          <button type="button" onClick={() => handleTabChange('auto-add')} className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'auto-add' ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-50 text-fuchsia-700'}`}>Auto Add</button>
        </div>
      </div>

      {activeTab === 'calendar' && !isDayPage && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          >
            Prev
          </button>
          <div className="rounded-lg bg-slate-100 px-4 py-1.5 text-sm text-slate-700">
            {monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => openCreatePage()}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1.5 text-sm text-violet-700"
          >
            <Plus size={14} /> Add Content
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day, dayIndex) => (
            <div key={day} className={`rounded-lg p-2 text-center text-xs ${WEEK_DAY_HEADER_CLASS[dayIndex]}`}>
              {day}
            </div>
          ))}
          {monthDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="min-h-[130px] rounded-lg bg-slate-50" />;
            const dateKey = toDateKey(day);
            const counts = countsByDate.get(dateKey);
            const hasAny = !!counts && Object.values(counts).some((val) => val > 0);
            const active = selectedDate === dateKey;
            const dayColumnIndex = idx % 7;
            const isWeekend = dayColumnIndex === 5 || dayColumnIndex === 6;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => navigate(`/content/day/${dateKey}`)}
                className={`min-h-[130px] rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-violet-400 bg-violet-50'
                    : isWeekend
                    ? 'border-rose-100 bg-rose-50/30 hover:border-rose-300'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <div className="mb-2 text-xs text-slate-500">{String(day.getDate()).padStart(2, '0')}</div>
                {hasAny ? (
                  <div className="space-y-1 text-xs">
                    {(counts?.linkedin || 0) > 0 && <div className="rounded bg-sky-100 px-2 py-0.5 text-sky-700">LinkedIn {counts?.linkedin}</div>}
                    {(counts?.youtube || 0) > 0 && <div className="rounded bg-red-100 px-2 py-0.5 text-red-700">YouTube {counts?.youtube}</div>}
                    {(counts?.general || 0) > 0 && <div className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">General {counts?.general}</div>}
                    {(counts?.newsletter || 0) > 0 && <div className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Mail {counts?.newsletter}</div>}
                    {(counts?.website || 0) > 0 && <div className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-700">Website {counts?.website}</div>}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {activeTab === 'calendar' ? (
        isDayPage ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Link to="/content" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700">
                  Back to calendar
                </Link>
              </div>
              <button
                type="button"
                onClick={() => openCreatePage(selectedDate)}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1.5 text-sm text-violet-700"
              >
                <Plus size={14} /> Add Content
              </button>
            </div>
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-500">Loading...</div>
            ) : selectedDayItems.length > 0 ? (
              <div className="space-y-3">
                {selectedDayItems.map((item) => (
                  <div key={item.contentId} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{TYPE_LABEL[item.type]}</span>
                      <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                      <div className="inline-flex items-center gap-2">
                        {userAvatarByEmpId[item.createdBy?.empId || ''] ? (
                          <img src={userAvatarByEmpId[item.createdBy?.empId || '']} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">{nameInitials(item.createdBy?.name || '')}</span>
                        )}
                        <span>Created by: {item.createdBy?.name || 'Unknown'}</span>
                      </div>
                      {(item.updatedAt && item.createdAt && item.updatedAt !== item.createdAt) ? (
                        <div className="inline-flex items-center gap-2">
                          {userAvatarByEmpId[item.updatedBy?.empId || ''] ? (
                            <img src={userAvatarByEmpId[item.updatedBy?.empId || '']} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">{nameInitials(item.updatedBy?.name || item.createdBy?.name || '')}</span>
                          )}
                          <span>Edited by: {item.updatedBy?.name || item.createdBy?.name || 'Unknown'}</span>
                        </div>
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-base text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-slate-600 break-words">{renderStyledDescription(item.description)}</p>
                    {item.attachments?.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {item.attachments.map((asset) => {
                          const isImage = String(asset.mimeType || '').startsWith('image/');
                          const extension = (asset.fileName || '').split('.').pop()?.toUpperCase() || 'FILE';
                          return (
                            <div key={`${asset.fileId}-${asset.fileUrl}`} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                              {isImage ? (
                                <img src={asset.fileUrl} alt={asset.fileName || 'attachment'} className="h-36 w-full rounded-lg object-cover" />
                              ) : (
                                <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                                  <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs">{extension}</span>
                                </div>
                              )}
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="truncate text-xs text-slate-600">{asset.fileName || asset.fileUrl}</div>
                                <a href={asset.fileUrl} download target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white">
                                  Download
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
                        <Pencil size={12} /> Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null
      ) : activeTab === 'auto-add' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Links</p>
              <div className="flex gap-2">
                <input value={newLinkValue} onChange={(e) => setNewLinkValue(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={addAutoLink} className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white">Add</button>
              </div>
              <div className="space-y-1 max-h-44 overflow-auto">
                {linkOptions.map((entry) => (
                  <div key={entry} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-xs">
                    <span className="truncate pr-2">{entry}</span>
                    <button type="button" onClick={() => removeAutoLink(entry)} className="text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Hashtags</p>
              <div className="flex gap-2">
                <input value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} placeholder="#tag" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={addAutoTag} className="rounded-lg bg-fuchsia-600 px-3 py-2 text-sm text-white">Add</button>
              </div>
              <div className="space-y-1 max-h-44 overflow-auto">
                {tagOptions.map((entry) => (
                  <div key={entry} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-xs">
                    <span className="truncate pr-2">{entry}</span>
                    <button type="button" onClick={() => removeAutoTag(entry)} className="text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => openCreatePage(selectedDate)}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1.5 text-sm text-violet-700"
              >
                <Plus size={14} /> Add a Reminder
              </button>
            </div>
          </div>
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-500">Loading...</div>
          ) : activeReminderItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No reminders found in this tab.</div>
          ) : (
            <div className="space-y-3">
              {activeReminderItems.map((item) => (
                <div key={item.contentId} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{TYPE_LABEL[item.type]}</span>
                    <span className="text-xs text-slate-400">{(item.contentDate || item.createdAt?.slice(0, 10)) || '-'}</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                    {userAvatarByEmpId[item.createdBy?.empId || ''] ? (
                      <img src={userAvatarByEmpId[item.createdBy?.empId || '']} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">{nameInitials(item.createdBy?.name || '')}</span>
                    )}
                    <span>Added by: {item.createdBy?.name || 'Unknown'}</span>
                  </div>
                  <h4 className="mt-2 text-base text-slate-900">{item.title}</h4>
                  <p className="mt-1 text-sm text-slate-600 break-words">{renderStyledDescription(item.description)}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
                      <Pencil size={12} /> Edit
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-violet-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl text-slate-900">{editingItem ? 'Edit Content' : 'Create Content'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select value={type} onChange={(e) => setType(e.target.value as ContentType)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none">
                  <option value="general">General</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="newsletter">Mail</option>
                  <option value="website">Website</option>
                </select>
                <input type="date" value={contentDate} onChange={(e) => setContentDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" />
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Description" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-slate-700">
                <FileText size={16} />
                {uploadingAttachment ? 'Uploading files...' : 'Add files'}
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rtf" className="hidden" onChange={(e) => handleAttachmentUpload(e.target.files)} />
              </label>
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {attachments.map((asset) => (
                    <div key={`${asset.fileId}-${asset.fileUrl}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <span className="truncate">{asset.fileName || asset.fileUrl}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((entry) => entry.fileId !== asset.fileId || entry.fileUrl !== asset.fileUrl))}
                        className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove attachment"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-white disabled:opacity-60">
                  {submitting ? 'Saving...' : editingItem ? 'Update Content' : 'Save Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg text-slate-900">Delete content?</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this content item?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete(deleteTarget.contentId);
                  setDeleteTarget(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ContentView;
