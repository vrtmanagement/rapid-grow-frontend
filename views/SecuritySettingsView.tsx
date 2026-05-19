import React from 'react';
import TwoFactorSettingsPanel from '../components/security/TwoFactorSettingsPanel';

const SecuritySettingsView: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Security</h1>
      <p className="text-slate-600 mt-1">Manage two-factor authentication and account protection.</p>
    </div>
    <TwoFactorSettingsPanel />
  </div>
);

export default SecuritySettingsView;
