import React from 'react';
import { X } from 'lucide-react';
import { WorkspaceTask } from '../../types';
import { getUserTimeZone } from '../../utils/timezone';

interface WorkspaceP1MessagesModalProps {
  messageTask: WorkspaceTask | null;
  onClose: () => void;
}

const WorkspaceP1MessagesModal: React.FC<WorkspaceP1MessagesModalProps> = ({
  messageTask,
  onClose,
}) => {
  if (!messageTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-slate-100 relative p-6">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-brand-red transition-colors"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h3 className="text-xl font-semibold text-brand-navy mb-1">
          Messages for: {messageTask.title}
        </h3>
        <p className="text-[13px] text-slate-500 mb-4">
          Status: {messageTask.status || 'todo'} · Priority: {messageTask.priority}
        </p>
        {Array.isArray(messageTask.messages) && messageTask.messages.length > 0 ? (
          <div className="space-y-2">
            {[...messageTask.messages]
              .sort(
                (a, b) =>
                  new Date(b.createdAt || '').getTime() -
                  new Date(a.createdAt || '').getTime()
              )
              .map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-800">
                        {m.from || 'Employee'}
                      </span>
                      {m.status && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                          {m.status}
                        </span>
                      )}
                    </div>
                    {m.createdAt && (
                      <span className="text-[11px] text-slate-400">
                        {new Date(m.createdAt).toLocaleString('en-US', { timeZone: getUserTimeZone(), hour12: true })}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-slate-800 whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-[14px] text-slate-500">No messages received from employees.</p>
        )}
      </div>
    </div>
  );
};

export default WorkspaceP1MessagesModal;
