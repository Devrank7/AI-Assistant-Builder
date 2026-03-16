import { useState, useCallback } from 'preact/hooks';

/**
 * Hook for Lead Form widget — manages multi-step form state,
 * validation, and submission.
 *
 * @param {Object} config - Form configuration
 * @param {Array} config.steps - Array of form steps
 * @param {string} config.clientId - Widget client ID
 * @param {string} config.apiBase - Base URL for API
 */
export function useForm({ steps = [], clientId, apiBase }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const currentFields = steps[currentStep]?.fields || [];
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const validateField = useCallback((field, value) => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return field.errorMessage || `${field.label} is required`;
    }
    if (field.type === 'email' && value) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) return 'Invalid email address';
    }
    if (field.type === 'phone' && value) {
      const phoneRe = /^[+]?[\d\s()-]{7,20}$/;
      if (!phoneRe.test(value)) return 'Invalid phone number';
    }
    if (field.minLength && value && value.length < field.minLength) {
      return `Minimum ${field.minLength} characters`;
    }
    if (field.pattern && value) {
      const re = new RegExp(field.pattern);
      if (!re.test(value)) return field.errorMessage || 'Invalid format';
    }
    return null;
  }, []);

  const validateCurrentStep = useCallback(() => {
    const newErrors = {};
    let valid = true;
    for (const field of currentFields) {
      const err = validateField(field, values[field.name]);
      if (err) {
        newErrors[field.name] = err;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [currentFields, values, validateField]);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    if (validateCurrentStep() && !isLastStep) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [validateCurrentStep, isLastStep]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const submit = useCallback(async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiBase}/api/widget/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, data: values }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [apiBase, clientId, values, validateCurrentStep]);

  return {
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
  };
}
