import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, LoaderCircle, MessageSquareMore, Sparkles, Workflow } from 'lucide-react';
import {
  type NotificationPreferences,
  fetchNotificationPreferences,
  getDefaultNotificationPreferences,
  saveNotificationPreferences,
} from '../../services/notificationPreferences';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface PreferenceRowConfig {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const preferenceRows: PreferenceRowConfig[] = [
  {
    key: 'dailyReviewReminders',
    title: 'Daily review reminders',
    description: 'Control review matrix reminders that appear in your notification center.',
    icon: BellRing,
  },
  {
    key: 'leaveUpdates',
    title: 'Leave updates',
    description: 'Get alerts when leave requests are submitted, reviewed, approved, or rejected.',
    icon: Workflow,
  },
  {
    key: 'aiTaskAlerts',
    title: 'AI task alerts',
    description: 'Receive AI assignment, approval, and overdue follow-up notifications.',
    icon: Sparkles,
  },
  {
    key: 'communicationMessages',
    title: 'Communication messages',
    description: 'Show communication message popups and new-message reminders from the chat module.',
    icon: MessageSquareMore,
  },
  {
    key: 'toastPreviews',
    title: 'Toast previews',
    description: 'Show floating reminder toasts for live updates without disabling the underlying modules.',
    icon: CheckCircle2,
  },
];

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

const PreferenceToggle: React.FC<ToggleProps> = ({ checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-8 w-[56px] shrink-0 items-center rounded-full border transition ${
      checked
        ? 'border-brand-red bg-brand-red'
        : 'border-slate-200 bg-slate-200/80'
    } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-red/60'}`}
  >
    <span
      className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition ${
        checked ? 'translate-x-[28px]' : 'translate-x-[3px]'
      }`}
    />
  </button>
);

const NotificationPreferencesPanel: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(getDefaultNotificationPreferences);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        setLoading(true);
        const nextPreferences = await fetchNotificationPreferences();
        if (active) {
          setPreferences(nextPreferences);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load notification preferences');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (saveState !== 'saved') return undefined;
    const timer = window.setTimeout(() => setSaveState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const nextValue = !preferences[key];
    const previousPreferences = preferences;
    const nextPreferences = { ...preferences, [key]: nextValue };

    setPreferences(nextPreferences);
    setSavingKey(key);
    setSaveState('saving');
    setError(null);

    try {
      const savedPreferences = await saveNotificationPreferences({ [key]: nextValue });
      setPreferences(savedPreferences);
      setSaveState('saved');
    } catch (err) {
      setPreferences(previousPreferences);
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Failed to update notification preferences');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        {preferenceRows.map(({ key, title, description, icon: Icon }) => {
          const isSavingRow = savingKey === key;
          return (
            <div
              key={key}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-red-50 text-brand-red">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-slate-500">{description}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {isSavingRow ? (
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500">
                      <LoaderCircle size={15} className="animate-spin" />
                      Saving
                    </span>
                  ) : (
                    <span className={`text-[13px] font-medium ${preferences[key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {preferences[key] ? 'On' : 'Off'}
                    </span>
                  )}
                  <PreferenceToggle
                    checked={preferences[key]}
                    disabled={loading || !!savingKey}
                    onChange={() => void handleToggle(key)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[20px] border border-slate-100 bg-white px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Changes save immediately for the current account and apply to live notification flows.
          </p>
          <p
            className={`text-sm font-semibold ${
              saveState === 'saved'
                ? 'text-emerald-600'
                : saveState === 'error'
                  ? 'text-rose-600'
                  : 'text-slate-400'
            }`}
          >
            {saveState === 'saving'
              ? 'Saving changes...'
              : saveState === 'saved'
                ? 'Preferences saved'
                : saveState === 'error'
                  ? 'Save failed'
                  : 'Ready'}
          </p>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
};

export default NotificationPreferencesPanel;
