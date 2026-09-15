import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
}

const fieldBase =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-lily-blue-500 focus:outline focus:outline-2 focus:outline-lily-blue-200 disabled:bg-slate-50 disabled:text-slate-500";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldWrapperProps
>(({ label, error, hint, className, id, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    )}
    <input ref={ref} id={id} className={clsx(fieldBase, error && "border-red-400", className)} {...props} />
    {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
    {error && <span className="text-xs text-red-600">{error}</span>}
  </div>
));
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldWrapperProps
>(({ label, error, hint, className, id, children, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    )}
    <select ref={ref} id={id} className={clsx(fieldBase, error && "border-red-400", className)} {...props}>
      {children}
    </select>
    {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
    {error && <span className="text-xs text-red-600">{error}</span>}
  </div>
));
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapperProps
>(({ label, error, hint, className, id, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    )}
    <textarea ref={ref} id={id} className={clsx(fieldBase, error && "border-red-400", className)} {...props} />
    {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
    {error && <span className="text-xs text-red-600">{error}</span>}
  </div>
));
Textarea.displayName = "Textarea";
