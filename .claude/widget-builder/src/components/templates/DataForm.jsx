import { useState } from 'react';

export default function DataForm({ ctx }) {
  const { fields = [], submitAction, successMessage, submitLabel } = ctx;
  const [formData, setFormData] = useState({});
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submitAction) return;
    for (const field of fields) {
      if (field.required && !formData[field.key]?.trim()) {
        setErrorMsg(`${field.label} is required`);
        return;
      }
    }
    setState('loading');
    setErrorMsg('');
    try {
      await ctx.executeIntegration(submitAction.provider, submitAction.action, formData);
      setState('success');
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="px-4 py-3 text-center">
        <p className="text-aw-text-primary text-sm">{successMessage || 'Submitted successfully!'}</p>
        <button onClick={() => { setState('idle'); setFormData({}); }}
          className="text-xs text-aw-link mt-2 underline">Submit another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-2 space-y-2.5">
      {fields.map(field => (
        <div key={field.key}>
          <label className="block text-xs text-aw-text-secondary mb-1">{field.label}{field.required && ' *'}</label>
          {field.type === 'textarea' ? (
            <textarea value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''} rows={3}
              className="w-full bg-aw-surface-input text-aw-text-primary border border-aw-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aw-focus-border resize-none" />
          ) : field.type === 'select' ? (
            <select value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
              className="w-full bg-aw-surface-input text-aw-text-primary border border-aw-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aw-focus-border">
              <option value="">Select...</option>
              {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <input type={field.type || 'text'} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              className="w-full bg-aw-surface-input text-aw-text-primary border border-aw-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aw-focus-border" />
          )}
        </div>
      ))}
      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      <button type="submit" disabled={state === 'loading'}
        className="w-full bg-aw-send text-white rounded-xl py-2.5 text-sm font-medium hover:bg-aw-send-hover transition-all disabled:opacity-50">
        {state === 'loading' ? 'Submitting...' : (submitLabel || 'Submit')}
      </button>
    </form>
  );
}
