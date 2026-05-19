import React, { useEffect, useState } from 'react';
import { fetchClientPortal } from '../services/p4Api';

function getPortalTokenFromHash() {
  const path = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (!path.startsWith('client-portal/')) return '';
  return path.slice('client-portal/'.length);
}

const ClientPortalView: React.FC = () => {
  const token = getPortalTokenFromHash();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchClientPortal(token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-8">
        <p className="text-slate-600">Loading project…</p>
      </main>
    );
  }

  const project = data.project;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6 sm:p-12">
      <article className="max-w-3xl mx-auto rounded-2xl bg-white shadow-lg border border-slate-200 p-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Client portal</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">{project.name}</h1>
          {project.description && (
            <p className="text-slate-600 mt-2">{project.description}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">Status: {project.status}</p>
        </header>
        <section>
          <h2 className="font-semibold text-slate-900 mb-3">Tasks (read-only)</h2>
          <ul className="space-y-2">
            {(data.tasks || []).map((task: any, idx: number) => (
              <li
                key={`${task.title}-${idx}`}
                className="flex justify-between rounded-lg border border-slate-100 px-4 py-3 text-sm"
              >
                <span>{task.title}</span>
                <span className="text-slate-500">{task.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
};

export default ClientPortalView;
