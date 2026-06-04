import React, { useEffect, useState } from 'react';

export interface CRMLeadPayload {
  leadType: string;
  customTabName?: string;
  firstName: string;
  lastName: string;
  url: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
  employeeCount: string;
  status: string;
  notes: string;
  customFields?: Record<string, { type: string; value: string }>;
  phoneNumber?: string;
  linkedinProfile?: string;
  leadSource?: string;
  birthday?: string;
  industry?: string;
}

interface CRMLeadFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CRMLeadPayload> & Record<string, unknown>;
  activeTab: string;
  variant?: 'inline' | 'modal';
  onCancel: () => void;
  onSubmit: (payload: CRMLeadPayload) => Promise<void>;
  onError: (message: string) => void;
}

const defaultLead = (activeTab: string): CRMLeadPayload => ({
  leadType: ['HOT', 'WARM', 'COLD'].includes(activeTab) ? activeTab : 'CUSTOM',
  customTabName: ['HOT', 'WARM', 'COLD'].includes(activeTab) ? '' : activeTab,
  firstName: '',
  lastName: '',
  url: '',
  email: '',
  company: '',
  position: '',
  connectedOn: '',
  employeeCount: '',
  status: 'ACTIVE',
  notes: '',
  phoneNumber: '',
  linkedinProfile: '',
  leadSource: '',
  birthday: '',
  industry: '',
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
const customFieldTypes = [
  { key: 'input', label: 'Input' },
  { key: 'number', label: 'Number' },
  { key: 'date', label: 'Date' },
  { key: 'date_range', label: 'Date From-To' },
  { key: 'textarea', label: 'Textarea' },
];

function normalizeLeadInitialData(
  activeTab: string,
  initialData?: Partial<CRMLeadPayload> & Record<string, unknown>,
): CRMLeadPayload {
  const next = { ...defaultLead(activeTab), ...(initialData || {}) } as CRMLeadPayload;
  const raw = initialData || {};
  const persistedCustomFields =
    raw.customFields && typeof raw.customFields === 'object' ? raw.customFields : {};
  const readCustomValue = (key: string) => {
    const value = (persistedCustomFields as Record<string, unknown>)?.[key];
    if (value && typeof value === 'object' && 'value' in (value as object)) {
      return String((value as { value?: unknown }).value ?? '');
    }
    return String(value ?? '');
  };

  const leadType = String(raw.leadType || next.leadType || '').toUpperCase();
  const customTabName = String(raw.customTabName || next.customTabName || '').trim();
  if (leadType === 'CUSTOM' && customTabName) {
    next.leadType = 'CUSTOM';
    next.customTabName = customTabName;
  } else if (['HOT', 'WARM', 'COLD'].includes(leadType)) {
    next.leadType = leadType;
    next.customTabName = '';
  }

  next.firstName = String(raw.firstName ?? next.firstName ?? '');
  next.lastName = String(raw.lastName ?? next.lastName ?? '');
  next.email = String(raw.email ?? next.email ?? '');
  next.company = String(raw.company ?? next.company ?? '');
  next.position = String(raw.position ?? next.position ?? '');
  next.url = String(raw.url ?? next.url ?? '');
  next.notes = String(raw.notes ?? next.notes ?? '');
  next.status = String(raw.status ?? next.status ?? 'ACTIVE').toUpperCase();
  next.phoneNumber = String(raw.phoneNumber ?? readCustomValue('phone_number') ?? '');
  next.linkedinProfile = String(raw.linkedinProfile ?? readCustomValue('linkedin_profile') ?? '');
  next.leadSource = String(raw.leadSource ?? readCustomValue('lead_source') ?? '');
  next.birthday = String(raw.birthday ?? readCustomValue('birthday') ?? '');
  next.industry = String(raw.industry ?? readCustomValue('industry') ?? '');
  if (raw.employeeCount !== null && raw.employeeCount !== undefined && raw.employeeCount !== '') {
    next.employeeCount = String(raw.employeeCount);
  }
  if (raw.connectedOn) {
    const parsed = new Date(String(raw.connectedOn));
    if (!Number.isNaN(parsed.getTime())) {
      next.connectedOn = parsed.toISOString().slice(0, 10);
    }
  }
  if (raw.customFields && typeof raw.customFields === 'object') {
    next.customFields = raw.customFields as CRMLeadPayload['customFields'];
  }
  return next;
}

const CRMLeadForm: React.FC<CRMLeadFormProps> = ({
  mode,
  initialData,
  activeTab,
  variant = 'inline',
  onCancel,
  onSubmit,
  onError,
}) => {
  const [form, setForm] = useState<CRMLeadPayload>(defaultLead(activeTab));
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldType, setCustomFieldType] = useState('input');
  const [customFields, setCustomFields] = useState<Array<{ key: string; type: string; value: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = normalizeLeadInitialData(activeTab, initialData);
    setForm(next);
    const initialCustom =
      next.customFields && typeof next.customFields === 'object'
        ? Object.entries(next.customFields).map(([key, value]) => {
            if (value && typeof value === 'object' && 'value' in value) {
              return {
                key,
                type: String((value as { type?: string }).type || 'input'),
                value: String((value as { value?: unknown }).value ?? ''),
              };
            }
            return { key, type: 'input', value: String(value ?? '') };
          })
        : [];
    setCustomFields(
      initialCustom.filter(
        (item) =>
          !['phone_number', 'linkedin_profile', 'lead_source', 'birthday', 'industry'].includes(item.key),
      ),
    );
    setErrors({});
  }, [activeTab, initialData, mode]);

  const setFieldError = (key: string, value: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const validateField = (key: string, value: string) => {
    const trimmed = String(value || '').trim();
    if (key === 'firstName') {
      if (!trimmed) return 'First Name is required.';
      if (trimmed.length > 40) return 'First Name must be 40 characters or less.';
      return '';
    }
    if (key === 'lastName') {
      if (!trimmed) return 'Last Name is required.';
      if (trimmed.length > 40) return 'Last Name must be 40 characters or less.';
      return '';
    }
    if (key === 'email') {
      if (!trimmed) return 'Email is required.';
      if (!emailRegex.test(trimmed.toLowerCase())) return 'Enter a valid email (must include @).';
      return '';
    }
    if (key === 'url') {
      if (trimmed && !urlRegex.test(trimmed)) return 'Enter a valid URL.';
      return '';
    }
    if (key === 'company') {
      if (trimmed && trimmed.length > 80) return 'Company must be 80 characters or less.';
      return '';
    }
    if (key === 'position') {
      if (trimmed && trimmed.length > 80) return 'Position must be 80 characters or less.';
      return '';
    }
    if (key === 'phoneNumber') {
      if (trimmed && !phoneRegex.test(trimmed)) return 'Enter a valid phone number.';
      return '';
    }
    if (key === 'linkedinProfile') {
      if (trimmed && !urlRegex.test(trimmed)) return 'Enter a valid LinkedIn URL.';
      return '';
    }
    if (key === 'employeeCount') {
      if (trimmed && Number(trimmed) < 0) return 'Employee Count cannot be negative.';
      return '';
    }
    if (key === 'notes') {
      if (trimmed && trimmed.length > 500) return 'Notes must be 500 characters or less.';
      return '';
    }
    return '';
  };

  const update = (key: keyof CRMLeadPayload, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setFieldError(key, validateField(key, value));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const fieldChecks: Array<[string, string]> = [
      ['firstName', form.firstName],
      ['lastName', form.lastName],
      ['email', form.email],
      ['url', form.url],
      ['company', form.company],
      ['position', form.position],
      ['phoneNumber', form.phoneNumber || ''],
      ['linkedinProfile', form.linkedinProfile || ''],
      ['employeeCount', form.employeeCount],
      ['notes', form.notes],
    ];
    for (const [key, value] of fieldChecks) {
      const message = validateField(key, value);
      if (message) nextErrors[key] = message;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const renderLabel = (text: string, required = false) => (
    <label className="text-sm font-medium text-slate-700 mb-1 block">
      {text}
      {required && <span className="text-red-600 ml-1">*</span>}
    </label>
  );

  const formPanel = (
    <div className="rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h3 id="crm-lead-form-title" className="text-lg font-semibold text-slate-800">{mode === 'create' ? 'Add Lead' : 'Edit Lead'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Fill lead details carefully. Required fields are marked in red.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          {variant === 'modal' ? 'Close' : 'Back'}
        </button>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            {renderLabel('First Name', true)}
            <input
              className={`rounded-lg border px-3 py-2 w-full ${errors.firstName ? 'border-red-400 bg-red-50/40' : 'border-slate-300'} focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red`}
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              onBlur={(e) => setFieldError('firstName', validateField('firstName', e.target.value))}
            />
            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            {renderLabel('Last Name', true)}
            <input
              className={`rounded-lg border px-3 py-2 w-full ${errors.lastName ? 'border-red-400 bg-red-50/40' : 'border-slate-300'} focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red`}
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              onBlur={(e) => setFieldError('lastName', validateField('lastName', e.target.value))}
            />
            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
          </div>
          <div>
            {renderLabel('Email Address', true)}
            <input className={`rounded-lg border px-3 py-2 w-full ${errors.email ? 'border-red-400 bg-red-50/40' : 'border-slate-300'} focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red`} value={form.email} onChange={(e) => update('email', e.target.value)} onBlur={(e) => setFieldError('email', validateField('email', e.target.value))} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div>
            {renderLabel('Phone Number')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.phoneNumber || ''} onChange={(e) => update('phoneNumber', e.target.value)} onBlur={(e) => setFieldError('phoneNumber', validateField('phoneNumber', e.target.value))} />
            {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>}
          </div>
          <div>
            {renderLabel('Company URL')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.url} onChange={(e) => update('url', e.target.value)} onBlur={(e) => setFieldError('url', validateField('url', e.target.value))} />
            {errors.url && <p className="text-xs text-red-600 mt-1">{errors.url}</p>}
          </div>
          <div>
            {renderLabel('Company')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.company} onChange={(e) => update('company', e.target.value)} onBlur={(e) => setFieldError('company', validateField('company', e.target.value))} />
            {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company}</p>}
          </div>
          <div>
            {renderLabel('Designation')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.position} onChange={(e) => update('position', e.target.value)} onBlur={(e) => setFieldError('position', validateField('position', e.target.value))} />
            {errors.position && <p className="text-xs text-red-600 mt-1">{errors.position}</p>}
          </div>
          <div>
            {renderLabel('LinkedIn Profile')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.linkedinProfile || ''} onChange={(e) => update('linkedinProfile', e.target.value)} onBlur={(e) => setFieldError('linkedinProfile', validateField('linkedinProfile', e.target.value))} />
            {errors.linkedinProfile && <p className="text-xs text-red-600 mt-1">{errors.linkedinProfile}</p>}
          </div>
          <div>
            {renderLabel('Lead Source')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.leadSource || ''} onChange={(e) => update('leadSource', e.target.value)} />
          </div>
          <div>
            {renderLabel('Birthday')}
            <input type="date" className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.birthday || ''} onChange={(e) => update('birthday', e.target.value)} />
          </div>
          <div>
            {renderLabel('Industry')}
            <input className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.industry || ''} onChange={(e) => update('industry', e.target.value)} />
          </div>
          <div>
            {renderLabel('Connected On')}
            <input type="date" className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.connectedOn} onChange={(e) => update('connectedOn', e.target.value)} />
          </div>
          <div>
            {renderLabel('Employee Count')}
            <input type="number" min="0" className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full" value={form.employeeCount} onChange={(e) => update('employeeCount', e.target.value)} onBlur={(e) => setFieldError('employeeCount', validateField('employeeCount', e.target.value))} />
            {errors.employeeCount && <p className="text-xs text-red-600 mt-1">{errors.employeeCount}</p>}
          </div>
          <div className="md:col-span-2">
            {renderLabel('Notes')}
            <textarea className="rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red px-3 py-2 w-full min-h-[88px]" value={form.notes} onChange={(e) => update('notes', e.target.value)} onBlur={(e) => setFieldError('notes', validateField('notes', e.target.value))} />
            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes}</p>}
          </div>
          <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 bg-slate-50/60">
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                {renderLabel('Add Custom Column')}
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 w-full"
                  placeholder="Column name (e.g. state, source)"
                  value={customFieldKey}
                  onChange={(e) => setCustomFieldKey(e.target.value)}
                />
              </div>
              <div className="w-44">
                {renderLabel('Type')}
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 w-full bg-white"
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value)}
                >
                  {customFieldTypes.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
                onClick={() => {
                  const key = customFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
                  if (!key) return;
                  if (customFields.some((item) => item.key === key)) return;
                  setCustomFields((prev) => [...prev, { key, type: customFieldType, value: '' }]);
                  setCustomFieldKey('');
                }}
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {customFields.map((field, idx) => (
                <div key={field.key} className="grid grid-cols-[1fr_140px_2fr_auto] gap-2 items-center">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 bg-slate-100 text-slate-700" value={field.key} readOnly />
                  <input className="rounded-lg border border-slate-300 px-3 py-2 bg-slate-100 text-slate-700" value={field.type} readOnly />
                  {field.type === 'textarea' ? (
                    <textarea
                      className="rounded-lg border border-slate-300 px-3 py-2 min-h-[76px]"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFields((prev) => prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))
                      }
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFields((prev) => prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))
                      }
                    />
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFields((prev) => prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))
                      }
                    />
                  ) : field.type === 'date_range' ? (
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="YYYY-MM-DD to YYYY-MM-DD"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFields((prev) => prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))
                      }
                    />
                  ) : (
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFields((prev) => prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))
                      }
                    />
                  )}
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded border border-red-300 text-red-600"
                    onClick={() => setCustomFields((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!customFields.length && <p className="text-xs text-slate-500">No custom columns added yet.</p>}
            </div>
          </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex justify-end gap-3">
        <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={onCancel}>Cancel</button>
        <button
          className="px-5 py-2 rounded-lg bg-brand-red text-white font-medium shadow-sm disabled:opacity-60"
          disabled={saving}
          onClick={async () => {
            if (!validate()) {
              onError('Please fix validation errors in the form.');
              return;
            }
            setSaving(true);
            try {
              await onSubmit({
                ...form,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim().toLowerCase(),
                company: form.company.trim(),
                position: form.position.trim(),
                url: form.url.trim(),
                notes: form.notes.trim(),
                phoneNumber: (form.phoneNumber || '').trim(),
                linkedinProfile: (form.linkedinProfile || '').trim(),
                leadSource: (form.leadSource || '').trim(),
                birthday: form.birthday || '',
                industry: (form.industry || '').trim(),
                customFields: customFields.reduce((acc, item) => {
                  if (item.key && item.value !== '') acc[item.key] = { type: item.type, value: item.value };
                  return acc;
                }, {
                  ...((form.phoneNumber || '').trim() ? { phone_number: { type: 'input', value: (form.phoneNumber || '').trim() } } : {}),
                  ...((form.linkedinProfile || '').trim() ? { linkedin_profile: { type: 'input', value: (form.linkedinProfile || '').trim() } } : {}),
                  ...((form.leadSource || '').trim() ? { lead_source: { type: 'input', value: (form.leadSource || '').trim() } } : {}),
                  ...(form.birthday ? { birthday: { type: 'date', value: form.birthday } } : {}),
                  ...((form.industry || '').trim() ? { industry: { type: 'input', value: (form.industry || '').trim() } } : {}),
                } as Record<string, { type: string; value: string }>),
              });
            } finally { setSaving(false); }
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-lead-form-title"
        onClick={onCancel}
      >
        <div
          className="my-auto w-full max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          {formPanel}
        </div>
      </div>
    );
  }

  return formPanel;
};

export default CRMLeadForm;
