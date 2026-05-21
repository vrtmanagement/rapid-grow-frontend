import React from 'react';
import SecuritySettingsPanel from '../components/security/SecuritySettingsPanel';

const SecuritySettingsView: React.FC = () => (
  <div className="mx-auto max-w-4xl space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Security</h1>
      <p className="mt-2 text-slate-600">Manage account protection, password security, and two-factor authentication.</p>
    </div>
    <SecuritySettingsPanel />
  </div>
);

export default SecuritySettingsView;
