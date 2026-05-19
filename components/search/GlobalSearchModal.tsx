import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../services/p3Api';

const GlobalSearchModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();

  if (!open) return null;

  const run = async () => {
    const data = await globalSearch(q);
    setResults(data.results);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/40 p-4 pt-24">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex gap-2 p-4 border-b border-slate-100">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Search tasks, people, leads, projects..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2"
          />
          <button type="button" onClick={run} className="rounded-xl bg-brand-red px-4 py-2 text-white text-sm font-semibold">
            Search
          </button>
          <button type="button" onClick={onClose} className="text-slate-500 px-2">
            ✕
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 text-sm space-y-4">
          {results && (
            <>
              <ResultGroup title="Tasks" items={results.tasks} onPick={(item: any) => { navigate(`/spaces/task/${item.taskId}`); onClose(); }} labelKey="title" />
              <ResultGroup title="People" items={results.employees} onPick={() => { navigate('/staff'); onClose(); }} labelKey="empName" />
              <ResultGroup title="Leads" items={results.leads} onPick={(item: any) => { navigate(`/crm/lead/${item._id}`); onClose(); }} labelKey="firstName" />
              <ResultGroup title="Projects" items={results.projects} onPick={() => { navigate('/workspaces'); onClose(); }} labelKey="name" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function ResultGroup({
  title,
  items = [],
  onPick,
  labelKey,
}: {
  title: string;
  items: any[];
  onPick: (item: any) => void;
  labelKey: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500 mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={item._id || item.taskId || item.projectId || i}>
            <button type="button" onClick={() => onPick(item)} className="text-left w-full hover:text-brand-red">
              {item[labelKey] || item.title || item.empId}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GlobalSearchModal;
