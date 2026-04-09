import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import { apiCreateContent, apiUploadContentFile, ContentAsset, ContentType } from '../services/contentApi';
import Toast from '../components/ui/Toast';

const LINK_STORAGE_KEY = 'rapidgrow-content-links-v1';
const TAG_STORAGE_KEY = 'rapidgrow-content-tags-v1';

function getInitialDate(search: string) {
  const value = new URLSearchParams(search).get('date') || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

function getMode(search: string) {
  const mode = new URLSearchParams(search).get('mode') || 'calendar';
  if (mode === 'follow-ee' || mode === 'follow-ega') return mode;
  return 'calendar';
}

function readStringList(storageKey: string, fallback: string[]) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const cleaned = parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

function extractStyledTokens(text: string) {
  const parts = String(text || '').split(/\s+/).filter(Boolean);
  return parts.filter((part) => /^https?:\/\/\S+$/i.test(part) || /^#[^\s#]+$/.test(part));
}

const ContentCreateView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = getMode(location.search);
  const isFollowMode = mode === 'follow-ee' || mode === 'follow-ega';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ContentType>('general');
  const [contentDate, setContentDate] = useState(getInitialDate(location.search));
  const [attachments, setAttachments] = useState<ContentAsset[]>([]);
  const [linkOptions, setLinkOptions] = useState<string[]>(() => readStringList(LINK_STORAGE_KEY, []));
  const [tagOptions, setTagOptions] = useState<string[]>(() => readStringList(TAG_STORAGE_KEY, []));
  const [newLinkValue, setNewLinkValue] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [showAutoAddedManager, setShowAutoAddedManager] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const linkPickerWrapRef = useRef<HTMLDivElement | null>(null);
  const tagPickerWrapRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const donePath = useMemo(() => {
    if (isFollowMode) return `/content?tab=${mode}`;
    return `/content/day/${contentDate}`;
  }, [contentDate, isFollowMode, mode]);
  const styledTokens = useMemo(() => extractStyledTokens(description), [description]);

  const appendToDescription = (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    const trimmedEnd = description.replace(/\s+$/, '');
    const next = trimmedEnd ? `${trimmedEnd} ${cleanToken}` : cleanToken;
    setDescription(next);
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => apiUploadContentFile(file)));
      setAttachments((prev) => [...prev, ...uploads]);
      setToast({ message: 'Files uploaded successfully.', type: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
      setToast({ message: err.message || 'Failed to upload attachment', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (asset: ContentAsset) => {
    setAttachments((prev) => prev.filter((entry) => entry.fileId !== asset.fileId || entry.fileUrl !== asset.fileUrl));
  };

  const saveAutoOptions = (links: string[], tags: string[]) => {
    setLinkOptions(links);
    setTagOptions(tags);
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links));
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
  };

  const addAutoLink = () => {
    const value = newLinkValue.trim();
    if (!value) return;
    const next = Array.from(new Set([...linkOptions, value]));
    saveAutoOptions(next, tagOptions);
    setNewLinkValue('');
  };

  const addAutoTag = () => {
    const value = newTagValue.trim();
    if (!value) return;
    const normalized = value.startsWith('#') ? value : `#${value}`;
    const next = Array.from(new Set([...tagOptions, normalized]));
    saveAutoOptions(linkOptions, next);
    setNewTagValue('');
  };

  const removeAutoLink = (value: string) => {
    const next = linkOptions.filter((entry) => entry !== value);
    saveAutoOptions(next, tagOptions);
  };

  const removeAutoTag = (value: string) => {
    const next = tagOptions.filter((entry) => entry !== value);
    saveAutoOptions(linkOptions, next);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      setToast({ message: 'Title is required.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateContent({
        title: title.trim(),
        description,
        type: isFollowMode ? 'newsletter' : type,
        contentDate,
        channelKey: isFollowMode ? mode : type,
        coverImage: null,
        attachments,
      });
      navigate(donePath, {
        state: {
          contentToast: {
            message: isFollowMode ? 'Reminder saved successfully.' : 'Content saved successfully.',
            type: 'success',
          },
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create content');
      setToast({ message: err.message || 'Failed to create content', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showLinkPicker && linkPickerWrapRef.current && !linkPickerWrapRef.current.contains(target)) {
        setShowLinkPicker(false);
      }
      if (showTagPicker && tagPickerWrapRef.current && !tagPickerWrapRef.current.contains(target)) {
        setShowTagPicker(false);
      }
    };

    if (showLinkPicker || showTagPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showLinkPicker, showTagPicker]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-slate-900">Add Content</h2>
        <Link to={donePath} className="text-sm text-slate-500 hover:text-slate-700">Back</Link>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" />
        {!isFollowMode && (
          <>
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
          </>
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={12}
          placeholder="Description / post body"
          className="min-h-[320px] w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-7 outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-slate-700">
            <FileText size={16} />
            {uploading ? 'Uploading files...' : 'Add files'}
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rtf" className="hidden" onChange={(e) => handleAttachmentUpload(e.target.files)} />
          </label>
          {!isFollowMode && (
            <>
              <div ref={linkPickerWrapRef} className="relative">
                {showLinkPicker && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-64 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {linkOptions.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No links in auto list.</p>
                    ) : (
                      linkOptions.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => {
                            appendToDescription(entry);
                            setShowLinkPicker(false);
                          }}
                          className="block w-full truncate rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                        >
                          {entry}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowTagPicker(false);
                    setShowLinkPicker((prev) => !prev);
                  }}
                  className="rounded-xl border border-violet-300 px-3 py-2 text-sm text-violet-700"
                >
                  Add Link
                </button>
              </div>
              <div ref={tagPickerWrapRef} className="relative">
                {showTagPicker && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-56 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {tagOptions.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">No hashtags in auto list.</p>
                    ) : (
                      tagOptions.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => {
                            appendToDescription(entry);
                            setShowTagPicker(false);
                          }}
                          className="block w-full truncate rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                        >
                          {entry}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkPicker(false);
                    setShowTagPicker((prev) => !prev);
                  }}
                  className="rounded-xl border border-fuchsia-300 px-3 py-2 text-sm text-fuchsia-700"
                >
                  Add Hashtag
                </button>
              </div>
              <button type="button" onClick={() => setShowAutoAddedManager(true)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Manage Auto Added
              </button>
            </>
          )}
        </div>
        {styledTokens.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs text-slate-500">Added links and tags</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {styledTokens.map((token, index) =>
                /^https?:\/\/\S+$/i.test(token) ? (
                  <a
                    key={`${token}-${index}`}
                    href={token}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {token}
                  </a>
                ) : (
                  <strong key={`${token}-${index}`} className="font-semibold text-slate-800">
                    {token}
                  </strong>
                )
              )}
            </div>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {attachments.map((asset) => (
              <div key={`${asset.fileId}-${asset.fileUrl}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <span className="truncate">{asset.fileName || asset.fileUrl}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(asset)}
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
          <Link to={donePath} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Cancel</Link>
          <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-white disabled:opacity-60">
            {submitting ? 'Saving...' : 'Save Content'}
          </button>
        </div>
      </form>
      {showAutoAddedManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-slate-900">Auto Added Links & Tags</h3>
              <button type="button" onClick={() => setShowAutoAddedManager(false)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Links</p>
                <div className="flex gap-2">
                  <input value={newLinkValue} onChange={(e) => setNewLinkValue(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={addAutoLink} className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white">Add</button>
                </div>
                <div className="space-y-1 max-h-36 overflow-auto">
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
                <div className="space-y-1 max-h-36 overflow-auto">
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
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ContentCreateView;
