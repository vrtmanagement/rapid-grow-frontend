import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Forward, Loader2, Send, X } from 'lucide-react';
import { ChatMessage } from '../../types';
import { RecipientSelector } from './RecipientSelector';
import { SelectedRecipients } from './SelectedRecipients';
import { ForwardRecipientOption } from './types';

const MAX_FORWARD_RECIPIENTS = 5;

export function ForwardModal({
  open,
  messages,
  recipients,
  onClose,
  onSubmit,
}: {
  open: boolean;
  messages: ChatMessage[];
  recipients: ForwardRecipientOption[];
  onClose: () => void;
  onSubmit: (recipientIds: string[], note: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRecipients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return recipients;
    return recipients.filter((recipient) =>
      [recipient.title, recipient.subtitle, recipient.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [query, recipients]);

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedRecipientIds.includes(recipient.recipientId)),
    [recipients, selectedRecipientIds]
  );

  const handleToggleRecipient = (recipient: ForwardRecipientOption) => {
    setSelectedRecipientIds((prev) => {
      if (prev.includes(recipient.recipientId)) {
        return prev.filter((recipientId) => recipientId !== recipient.recipientId);
      }
      if (prev.length >= MAX_FORWARD_RECIPIENTS) return prev;
      return [...prev, recipient.recipientId];
    });
  };

  const handleClose = () => {
    if (submitting) return;
    setQuery('');
    setSelectedRecipientIds([]);
    setNote('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedRecipientIds.length || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(selectedRecipientIds, note);
      handleClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to forward messages');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-slate-950/40 backdrop-blur-[2px]"
        >
          <div className="flex h-full w-full items-center justify-center p-4">
            <motion.div
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="flex max-h-[min(640px,88dvh)] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
                    <Forward size={16} className="text-slate-500" />
                    Forward message
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Send {messages.length} {messages.length === 1 ? 'message' : 'messages'} to one or more chats
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close forward panel"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-h-0 border-b border-slate-100 p-3 md:border-b-0 md:border-r">
                  <RecipientSelector
                    query={query}
                    onQueryChange={setQuery}
                    recipients={filteredRecipients}
                    selectedRecipientIds={selectedRecipientIds}
                    maxRecipients={MAX_FORWARD_RECIPIENTS}
                    onToggleRecipient={handleToggleRecipient}
                  />
                </div>

                <div className="flex min-h-0 flex-col bg-slate-50/60">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-800">Recipients</div>
                      <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <ArrowRight size={11} />
                        {selectedRecipientIds.length}
                      </div>
                    </div>
                    {selectedRecipients.length ? (
                      <SelectedRecipients
                        recipients={selectedRecipients}
                        onRemove={(recipientId) =>
                          setSelectedRecipientIds((prev) => prev.filter((currentId) => currentId !== recipientId))
                        }
                      />
                    ) : (
                      <p className="text-[11px] leading-5 text-slate-400">Choose one or more chats from the list.</p>
                    )}
                  </div>

                  <div className="px-3 py-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-800">Note</label>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      placeholder="Optional message…"
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                    />
                    {error ? (
                      <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {error}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={!selectedRecipientIds.length || submitting}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      Send forward
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
