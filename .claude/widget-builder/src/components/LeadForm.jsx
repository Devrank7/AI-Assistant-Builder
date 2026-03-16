import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useForm } from '../hooks/useForm';
import { useDrag } from '../hooks/useDrag';
import { useLanguage } from '../hooks/useLanguage';

const CFG = typeof window !== 'undefined' && window.__WIDGET_CFG__ ? window.__WIDGET_CFG__ : {};
const API_BASE = CFG.apiBase || '';
const CLIENT_ID = CFG.clientId || '';
const FORM_CONFIG = CFG.formConfig || { steps: [{ fields: [] }] };

export default function LeadForm() {
  const [isOpen, setIsOpen] = useState(false);
  const { position, onPointerDown } = useDrag();
  const { t } = useLanguage();
  const {
    currentStep,
    totalSteps,
    currentFields,
    values,
    errors,
    submitting,
    submitted,
    submitError,
    isFirstStep,
    isLastStep,
    setValue,
    nextStep,
    prevStep,
    submit,
  } = useForm({ steps: FORM_CONFIG.steps, clientId: CLIENT_ID, apiBase: API_BASE });

  const renderField = (field) => {
    const val = values[field.name] || '';
    const err = errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <select
            class={`wbx-form-input ${err ? 'wbx-form-input-error' : ''}`}
            value={val}
            onChange={(e) => setValue(field.name, e.target.value)}
          >
            <option value="">{field.placeholder || t('select', 'Select...')}</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            class={`wbx-form-input wbx-form-textarea ${err ? 'wbx-form-input-error' : ''}`}
            placeholder={field.placeholder || ''}
            value={val}
            onInput={(e) => setValue(field.name, e.target.value)}
            rows={field.rows || 3}
          />
        );
      default:
        return (
          <input
            class={`wbx-form-input ${err ? 'wbx-form-input-error' : ''}`}
            type={field.type || 'text'}
            placeholder={field.placeholder || ''}
            value={val}
            onInput={(e) => setValue(field.name, e.target.value)}
          />
        );
    }
  };

  return (
    <div class="wbx-form-root">
      {/* Toggle Button */}
      <button
        class="wbx-form-toggle"
        onClick={() => setIsOpen(!isOpen)}
        onPointerDown={onPointerDown}
        style={{ bottom: position.y + 'px', right: position.x + 'px' }}
        aria-label={isOpen ? 'Close form' : 'Open form'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="14" y2="13" />
            <line x1="8" y1="17" x2="12" y2="17" />
          </svg>
        )}
      </button>

      {/* Form Panel */}
      {isOpen && (
        <div class="wbx-form-panel">
          {/* Header */}
          <div class="wbx-form-header">
            <h2 class="wbx-form-title">{FORM_CONFIG.title || t('form_title', 'Get in Touch')}</h2>
            <button class="wbx-form-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {submitted ? (
            /* Success State */
            <div class="wbx-form-success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 12 15 16 10" />
              </svg>
              <h3>{FORM_CONFIG.successTitle || t('form_success', 'Thank you!')}</h3>
              <p>{FORM_CONFIG.successMessage || t('form_success_msg', "We'll be in touch soon.")}</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              {totalSteps > 1 && (
                <div class="wbx-form-progress">
                  <div class="wbx-form-progress-bar">
                    <div
                      class="wbx-form-progress-fill"
                      style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                  </div>
                  <span class="wbx-form-progress-text">
                    {t('step', 'Step')} {currentStep + 1}/{totalSteps}
                  </span>
                </div>
              )}

              {/* Step Title */}
              {FORM_CONFIG.steps[currentStep]?.title && (
                <h3 class="wbx-form-step-title">{FORM_CONFIG.steps[currentStep].title}</h3>
              )}

              {/* Fields */}
              <div class="wbx-form-fields">
                {currentFields.map((field) => (
                  <div key={field.name} class="wbx-form-field">
                    <label class="wbx-form-label">
                      {field.label}
                      {field.required && <span class="wbx-form-required">*</span>}
                    </label>
                    {renderField(field)}
                    {errors[field.name] && <span class="wbx-form-error">{errors[field.name]}</span>}
                  </div>
                ))}
              </div>

              {/* Submit Error */}
              {submitError && <div class="wbx-form-submit-error">{submitError}</div>}

              {/* Navigation */}
              <div class="wbx-form-nav">
                {!isFirstStep && (
                  <button class="wbx-form-btn-back" onClick={prevStep}>
                    {t('back', 'Back')}
                  </button>
                )}
                {isLastStep ? (
                  <button class="wbx-form-btn-submit" onClick={submit} disabled={submitting}>
                    {submitting ? t('submitting', 'Sending...') : FORM_CONFIG.submitLabel || t('submit', 'Submit')}
                  </button>
                ) : (
                  <button class="wbx-form-btn-next" onClick={nextStep}>
                    {t('next', 'Next')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
