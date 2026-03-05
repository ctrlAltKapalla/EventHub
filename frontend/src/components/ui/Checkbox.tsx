import { forwardRef, InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={[
              "h-4 w-4 rounded border-neutral-300 text-primary-600",
              "focus:ring-primary-600 focus:ring-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            ].join(" ")}
            {...props}
          />
          <span className="text-sm text-neutral-900">{label}</span>
        </label>
        {error && <p className="text-xs text-error ml-6">{error}</p>}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
