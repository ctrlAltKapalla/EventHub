import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-900">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full px-3 py-2 rounded-lg border bg-white text-neutral-900 text-sm",
            "placeholder:text-neutral-600/50",
            "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent",
            "disabled:bg-neutral-100 disabled:cursor-not-allowed",
            "transition-shadow duration-150",
            error ? "border-error" : "border-neutral-300",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-neutral-600">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
