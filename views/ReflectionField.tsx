import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  extractVoiceSaveCommand,
  getSpeechRecognitionConstructor,
  insertSpokenAtCaret,
} from './hourlyTrackingHelpers';

export const reflectionTextareaClassName =
  'w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-[15px] leading-relaxed text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10';

export type ReflectionVoiceTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Called after a final voice command like "submit this" / "save it" (value already updated). */
  onVoiceSave?: (nextValue: string) => void;
};

type VoiceInsertState = {
  before: string;
  after: string;
  startResultIndex: number;
  lastResultsLength: number;
  ignoreSelect: boolean;
};

export const ReflectionVoiceTextarea: React.FC<ReflectionVoiceTextareaProps> = ({
  value,
  onChange,
  rows = 4,
  placeholder = 'Share your thoughts...',
  className = reflectionTextareaClassName,
  disabled = false,
  onVoiceSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const voiceSessionRef = useRef(0);
  const voiceInsertRef = useRef<VoiceInsertState>({
    before: '',
    after: '',
    startResultIndex: 0,
    lastResultsLength: 0,
    ignoreSelect: false,
  });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognitionConstructor());
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const captureCaret = (options?: { reanchorSpeech?: boolean }) => {
    const el = textareaRef.current;
    const text = el ? el.value : value;
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : start;
    const prev = voiceInsertRef.current;
    voiceInsertRef.current = {
      before: text.slice(0, Math.max(0, start)),
      after: text.slice(Math.max(start, end)),
      startResultIndex: options?.reanchorSpeech ? prev.lastResultsLength : prev.startResultIndex,
      lastResultsLength: prev.lastResultsLength,
      ignoreSelect: prev.ignoreSelect,
    };
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (disabled) return;
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      stopListening();
      return;
    }

    const previousRecognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      previousRecognition?.stop();
    } catch {
      // ignore
    }
    setListening(false);

    captureCaret();
    const insertBefore = voiceInsertRef.current.before;
    const insertAfter = voiceInsertRef.current.after;
    voiceInsertRef.current = {
      before: insertBefore,
      after: insertAfter,
      startResultIndex: 0,
      lastResultsLength: 0,
      ignoreSelect: false,
    };
    const sessionId = ++voiceSessionRef.current;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: {
      results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }>;
    }) => {
      if (voiceSessionRef.current !== sessionId) return;

      const anchor = voiceInsertRef.current;
      anchor.lastResultsLength = event.results.length;

      let transcript = '';
      for (let i = anchor.startResultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || '';
        if (transcript && piece && !/\s$/.test(transcript) && !/^\s/.test(piece)) {
          transcript += ' ';
        }
        transcript += piece;
      }

      const lastResult = event.results[event.results.length - 1];
      const lastIsFinal = Boolean(lastResult?.isFinal);
      const { spokenWithoutCommand, shouldSave } = extractVoiceSaveCommand(transcript);
      const spokenForBox = shouldSave ? spokenWithoutCommand : transcript;
      const { text: next, cursor } = insertSpokenAtCaret(anchor.before, spokenForBox, anchor.after);
      onChange(next);

      if (shouldSave && lastIsFinal) {
        voiceSessionRef.current += 1;
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
        setListening(false);
        onVoiceSave?.(next);
        return;
      }

      anchor.ignoreSelect = true;
      requestAnimationFrame(() => {
        if (voiceSessionRef.current !== sessionId) return;
        const el = textareaRef.current;
        if (!el) {
          anchor.ignoreSelect = false;
          return;
        }
        el.focus();
        el.setSelectionRange(cursor, cursor);
        requestAnimationFrame(() => {
          anchor.ignoreSelect = false;
        });
      });
    };

    recognition.onerror = (event: { error?: string }) => {
      if (voiceSessionRef.current !== sessionId) return;
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setListening(false);
    };

    recognition.onend = () => {
      if (voiceSessionRef.current !== sessionId) return;
      setListening(false);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      captureCaret();
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const el = e.currentTarget;
          onChange(el.value);
          if (listening) {
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? start;
            const prev = voiceInsertRef.current;
            voiceInsertRef.current = {
              before: el.value.slice(0, start),
              after: el.value.slice(end),
              startResultIndex: prev.lastResultsLength,
              lastResultsLength: prev.lastResultsLength,
              ignoreSelect: prev.ignoreSelect,
            };
          }
        }}
        onClick={() => {
          if (voiceInsertRef.current.ignoreSelect) return;
          captureCaret({ reanchorSpeech: listening });
        }}
        onKeyUp={(e) => {
          if (voiceInsertRef.current.ignoreSelect) return;
          if (
            listening ||
            e.key === 'Enter' ||
            e.key.startsWith('Arrow') ||
            e.key === 'Home' ||
            e.key === 'End'
          ) {
            captureCaret({ reanchorSpeech: listening });
          } else if (!listening) {
            captureCaret();
          }
        }}
        onSelect={() => {
          if (voiceInsertRef.current.ignoreSelect) return;
          captureCaret({ reanchorSpeech: listening });
        }}
        rows={rows}
        className={className}
        placeholder={placeholder}
      />
      {voiceSupported && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            captureCaret();
          }}
          onClick={(e) => {
            e.preventDefault();
            startListening();
          }}
          aria-label={listening ? 'Stop voice input' : 'Start voice to text'}
          title={listening ? 'Stop voice input' : 'Voice to text — say “submit this” to save'}
          className={`absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition ${
            listening
              ? 'bg-brand-red text-white shadow-lg shadow-red-500/35 animate-pulse'
              : 'bg-red-100 text-brand-red hover:bg-red-200/80'
          }`}
        >
          {listening ? (
            <MicOff size={14} strokeWidth={2.5} />
          ) : (
            <Mic size={14} strokeWidth={2.5} className="text-brand-red" />
          )}
        </button>
      )}
    </div>
  );
};

export type ReflectionFieldProps = {
  step: number;
  label: string;
  helper?: string;
  footer?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  onVoiceSave?: (nextValue: string) => void;
};

export const ReflectionField: React.FC<ReflectionFieldProps> = ({
  step,
  label,
  helper,
  footer,
  value,
  onChange,
  icon,
  placeholder = 'Share your thoughts...',
  disabled = false,
  onVoiceSave,
}) => (
  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors focus-within:border-brand-red/30 focus-within:bg-white focus-within:shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
    <div className="mb-3 flex items-start gap-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-brand-red shadow-sm ring-1 ring-slate-200/80">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <label className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-red ring-1 ring-slate-200/80">
            {icon}
          </span>
          {label}
          <span className="text-brand-red" aria-hidden="true">
            *
          </span>
        </label>
        {helper ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{helper}</p> : null}
      </div>
    </div>
    <ReflectionVoiceTextarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onVoiceSave={onVoiceSave}
    />
    {footer ? <div className="mt-3">{footer}</div> : null}
  </div>
);
