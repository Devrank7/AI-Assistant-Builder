import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-text-secondary block text-xs font-medium">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`text-text-primary placeholder:text-text-tertiary border-border focus:border-accent focus:ring-accent/10 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
export { Input, type InputProps };
