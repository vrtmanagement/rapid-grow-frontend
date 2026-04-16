import { API_BASE } from '../config/api';

interface AnalysisCommunicationItem {
  discType: string;
  sourceFile: string;
  guidance: string[];
}

interface AnalysisRecommendation {
  styleSummary: string;
  doList: string[];
  avoidList: string[];
}

interface AnalysisEmailTemplate {
  subject: string;
  body: string;
}

export interface TrimetrixAnalysisResult {
  fileName: string;
  discTypes: string[];
  communication: AnalysisCommunicationItem[];
  recommendation?: AnalysisRecommendation;
  emailTemplate?: AnalysisEmailTemplate;
  message: string;
}

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export async function apiAnalyzeTrimetrix(file: File): Promise<TrimetrixAnalysisResult> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/analysis/trimetrix/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to analyze Trimetrix report');
  }

  return res.json();
}
