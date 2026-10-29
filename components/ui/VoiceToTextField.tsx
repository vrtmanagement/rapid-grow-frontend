import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  extractVoiceSaveCommand,
  getSpeechRecognitionConstructor,
  insertSpokenAtCaret,
} from '../../views/hourlyTrackingHelpers';

type VoiceInsertState = {
  before: string;
  after: string;
  startResultIndex: number;
  lastResultsLength: number;
  ignoreSelect: boolean;
};

export type VoiceToTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  as?: 'input' | 'textarea';
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When true, trailing “submit/save/update” voice phrases trigger onVoiceSave. Default false. */
  enableSaveCommands?: boolean;
  onVoiceSave?: (nextValue: string) => void;
};

export const VoiceToTextField: React.FC<VoiceToTextFieldProps> = ({
  value,
  onChange,
  as = 'textarea',
  rows = 4,
  placeholder,
  className = '',
  disabled = false,
  enableSaveCommands = false,
  onVoiceSave,
}) => {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
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
    const el = fieldRef.current;
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

      let spokenForBox = transcript;
      let shouldSave = false;
      if (enableSaveCommands) {
        const extracted = extractVoiceSaveCommand(transcript);
        spokenForBox = extracted.shouldSave ? extracted.spokenWithoutCommand : transcript;
        shouldSave = extracted.shouldSave;
      }

      const lastResult = event.results[event.results.length - 1];
      const lastIsFinal = Boolean(lastResult?.isFinal);
      const { text: next, cursor } = insertSpokenAtCaret(anchor.before, spokenForBox, anchor.after);
      onChange(next);

      if (enableSaveCommands && shouldSave && lastIsFinal) {
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
        const el = fieldRef.current;
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

  const fieldClassName = className.includes('pr-') ? className : `${className} pr-12`.trim();

  const sharedProps = {
    value,
    disabled,
    placeholder,
    className: fieldClassName,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    },
    onClick: () => {
      if (voiceInsertRef.current.ignoreSelect) return;
      captureCaret({ reanchorSpeech: listening });
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    },
    onSelect: () => {
      if (voiceInsertRef.current.ignoreSelect) return;
      captureCaret({ reanchorSpeech: listening });
    },
  };

  return (
    <div className="relative">
      {as === 'input' ? (
        <input ref={fieldRef as React.RefObject<HTMLInputElement>} type="text" {...sharedProps} />
      ) : (
        <textarea ref={fieldRef as React.RefObject<HTMLTextAreaElement>} rows={rows} {...sharedProps} />
      )}
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
          title={listening ? 'Stop voice input' : 'Voice to text'}
          className={`absolute right-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition ${
            as === 'textarea' ? 'top-2' : 'top-1/2 -translate-y-1/2'
          } ${
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

export default VoiceToTextField;
