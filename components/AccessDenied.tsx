import React from 'react';

const AccessDenied: React.FC<{ title?: string; message?: string }> = ({
  title = 'Access Denied',
  message = "You don't have access to this feature.",
}) => {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl text-slate-900">{title}</h2>
        <p className="text-slate-600 mt-3">{message}</p>
      </div>
    </div>
  );
};

export default AccessDenied;
