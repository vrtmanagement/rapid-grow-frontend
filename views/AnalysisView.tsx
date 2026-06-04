import React, { useState } from 'react';
import { apiAnalyzeTrimetrix, TrimetrixAnalysisResult } from '../services/analysisApi';

const AnalysisView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrimetrixAnalysisResult | null>(null);

  const onAnalyze = async () => {
    if (!file) {
      setError('Please select a Trimetrix PDF report.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await apiAnalyzeTrimetrix(file);
      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-4xl space-y-6 ${embedded ? 'w-full' : ''}`}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!embedded ? (
          <h1 className="text-2xl font-semibold text-slate-900">Analysis</h1>
        ) : null}
        <p className={`text-sm text-slate-600 ${embedded ? '' : 'mt-2'}`}>
          Upload a Trimetrix report to detect DISC type and generate communication guidance.
        </p>
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center ${embedded ? 'mt-4' : 'mt-5'}`}>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="rounded-lg bg-brand-red px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Analyzing...' : 'Analyze report'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Report: {result.fileName}</p>
          {result.personName && (
            <p className="mt-1 text-sm text-slate-600">Person: {result.personName}</p>
          )}
          <p className="mt-2 text-base font-medium text-slate-900">
            DISC Type: {result.discTypes.length ? result.discTypes.join(', ') : 'Not detected'}
          </p>
          <p className="mt-2 text-sm text-slate-600">{result.message}</p>
          {result.recommendation && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-semibold text-slate-900">How to communicate with this person</p>
              <p className="mt-2 text-sm text-slate-700">{result.recommendation.styleSummary}</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Do this</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {result.recommendation.doList.map((tip, idx) => (
                      <li key={`do-${idx}`}>- {tip}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Avoid this</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {result.recommendation.avoidList.map((tip, idx) => (
                      <li key={`avoid-${idx}`}>- {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {result.emailTemplate && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Masterclass invitation email (ready to use)</p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">Subject:</span> {result.emailTemplate.subject}
              </p>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                {result.emailTemplate.body}
              </pre>
            </div>
          )}
          <div className="mt-6 space-y-5">
            {result.communication.map((item) => (
              <div key={`${item.discType}-${item.sourceFile}`} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {item.discType} communication guide
                </p>
                <p className="text-xs text-slate-500">Source: {item.sourceFile}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {item.guidance.map((line, index) => (
                    <li key={`${item.discType}-${index}`}>- {line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
