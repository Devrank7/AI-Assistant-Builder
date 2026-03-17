'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PluginManifest } from '@/lib/integrations/core/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Check, X, Loader2, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

interface ConnectionWizardProps {
  open: boolean;
  manifest: PluginManifest | null;
  onClose: () => void;
  onConnected: () => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Credentials', 'Testing', 'Review', 'Success'];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

interface TestResult {
  healthy: boolean;
  error?: string;
  suggestion?: string;
  details?: Record<string, unknown>;
}

export function ConnectionWizard({ open, manifest, onClose, onConnected }: ConnectionWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testProgress, setTestProgress] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Record<string, boolean>>({});
  const [connectError, setConnectError] = useState('');

  const reset = useCallback(() => {
    setStep(1);
    setDirection(1);
    setCredentials({});
    setVisibleFields({});
    setTesting(false);
    setTestResult(null);
    setTestProgress([]);
    setConnecting(false);
    setSelectedActions({});
    setConnectError('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const goToStep = (s: Step) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFieldVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isCredentialsValid =
    manifest?.authFields.filter((f) => f.required).every((f) => credentials[f.key]?.trim()) ?? false;

  // Step 2: Test connection
  const handleTest = async () => {
    if (!manifest) return;
    setTesting(true);
    setTestResult(null);
    setTestProgress([]);

    const steps = [`Connecting to ${manifest.name}...`, 'Validating credentials...', 'Checking permissions...'];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setTestProgress((prev) => [...prev, steps[i]]);
    }

    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: manifest.slug, credentials }),
      });
      const data = await res.json();
      setTestResult(data);

      if (data.healthy) {
        // Initialize action selections
        const actions: Record<string, boolean> = {};
        manifest.actions.forEach((a) => {
          actions[a.id] = true;
        });
        setSelectedActions(actions);
      }
    } catch {
      setTestResult({ healthy: false, error: 'Network error. Please check your connection.' });
    } finally {
      setTesting(false);
    }
  };

  // Step 3: Connect
  const handleConnect = async () => {
    if (!manifest) return;
    setConnecting(true);
    setConnectError('');

    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: manifest.slug, credentials }),
      });
      const data = await res.json();

      if (data.success === false || data.error) {
        setConnectError(data.error || 'Failed to connect');
        return;
      }

      goToStep(4);
    } catch {
      setConnectError('Network error. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDone = () => {
    onConnected();
    handleClose();
  };

  if (!manifest) return null;

  const accentColor = manifest.color;
  const enabledActionsCount = Object.values(selectedActions).filter(Boolean).length;

  return (
    <Modal open={open} onClose={handleClose} title={`Connect ${manifest.name}`} size="lg">
      {/* Step progress indicator */}
      <div className="mb-6 flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all',
                    isCompleted && 'bg-emerald-500 text-white',
                    isActive && 'text-white',
                    !isActive && !isCompleted && 'bg-bg-tertiary text-text-tertiary'
                  )}
                  style={isActive ? { backgroundColor: accentColor } : undefined}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                </div>
                <span className={cn('text-[10px] font-medium', isActive ? 'text-text-primary' : 'text-text-tertiary')}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'mb-4 h-[2px] flex-1 rounded-full transition-colors',
                    step > stepNum ? 'bg-emerald-500' : 'bg-bg-tertiary'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content with animation */}
      <div className="relative min-h-[260px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: Credentials */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-4"
            >
              {manifest.authFields.map((field) => (
                <div key={field.key} className="relative">
                  <Input
                    label={field.label}
                    type={field.type === 'password' && !visibleFields[field.key] ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={credentials[field.key] || ''}
                    onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                    required={field.required}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      className="text-text-tertiary hover:text-text-secondary absolute top-[30px] right-2.5 transition-colors"
                      onClick={() => toggleFieldVisibility(field.key)}
                    >
                      {visibleFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="md" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!isCredentialsValid}
                  onClick={() => {
                    goToStep(2);
                    handleTest();
                  }}
                >
                  Test Connection
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Testing */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-4"
            >
              <div className="space-y-3">
                {testProgress.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5"
                  >
                    {testing && i === testProgress.length - 1 ? (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
                    ) : testResult?.healthy || i < testProgress.length - 1 ? (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    ) : testResult && !testResult.healthy ? (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                        <X className="h-2.5 w-2.5 text-white" />
                      </div>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
                    )}
                    <span className="text-text-secondary text-sm">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* Test result */}
              {!testing && testResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-lg border p-4',
                    testResult.healthy ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                  )}
                >
                  {testResult.healthy ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-emerald-400">Connection successful</p>
                      {testResult.details && (
                        <p className="text-text-tertiary text-xs">{JSON.stringify(testResult.details)}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-400">{testResult.error || 'Connection failed'}</p>
                      {testResult.suggestion && <p className="text-text-tertiary text-xs">{testResult.suggestion}</p>}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action buttons */}
              {!testing && testResult && (
                <div className="flex justify-end gap-2 pt-2">
                  {testResult.healthy ? (
                    <Button variant="primary" size="md" onClick={() => goToStep(3)}>
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="md" onClick={() => goToStep(1)}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                      </Button>
                      <Button variant="primary" size="md" onClick={handleTest}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-4"
            >
              {/* Provider info */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                >
                  {manifest.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-text-primary text-sm font-semibold">{manifest.name}</h3>
                  <p className="text-text-tertiary text-xs">{manifest.description}</p>
                </div>
              </div>

              {/* Actions */}
              {manifest.actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-text-secondary text-xs font-medium tracking-wider uppercase">
                    Available Actions
                  </h4>
                  <div className="space-y-1.5">
                    {manifest.actions.map((action) => (
                      <label
                        key={action.id}
                        className="border-border hover:bg-bg-tertiary flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-[var(--color-accent)]"
                          checked={selectedActions[action.id] ?? true}
                          onChange={(e) => setSelectedActions((prev) => ({ ...prev, [action.id]: e.target.checked }))}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-text-primary text-sm font-medium">{action.name}</p>
                          <p className="text-text-tertiary text-xs">{action.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-bg-tertiary rounded-lg p-3">
                <p className="text-text-secondary text-xs">
                  {enabledActionsCount} action{enabledActionsCount !== 1 ? 's' : ''} will be enabled for{' '}
                  <span className="text-text-primary font-medium">{manifest.name}</span>.
                </p>
              </div>

              {connectError && <p className="text-xs text-red-500">{connectError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="md" onClick={() => goToStep(2)}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <Button variant="primary" size="md" disabled={connecting} onClick={handleConnect}>
                  {connecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
              >
                <Check className="h-8 w-8 text-emerald-500" />
              </motion.div>

              <div className="text-center">
                <h3 className="text-text-primary text-lg font-semibold">Connected!</h3>
                <p className="text-text-secondary mt-1 text-sm">
                  {manifest.name} has been successfully connected with {enabledActionsCount} action
                  {enabledActionsCount !== 1 ? 's' : ''}.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {manifest.actions
                  .filter((a) => selectedActions[a.id])
                  .map((action) => (
                    <Badge key={action.id} variant="green">
                      {action.name}
                    </Badge>
                  ))}
              </div>

              <Button variant="primary" size="md" onClick={handleDone} className="mt-2">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
