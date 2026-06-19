import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  helpText?: string
}

export function FormField({ label, required, error, children, helpText }: FieldProps) {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}
        {required && <span className="required-mark">*</span>}
      </label>
      <div className="field-input">
        {children}
      </div>
      {helpText && <p className="field-help">{helpText}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  error?: string
  helpText?: string
}

export function InputField({ label, required, error, helpText, ...props }: InputProps) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <input className="text-input" {...props} />
    </FormField>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  required?: boolean
  error?: string
  helpText?: string
  options: { value: string; label: string }[]
}

export function SelectField({ label, required, error, helpText, options, ...props }: SelectProps) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <select className="select-input" {...props}>
        <option value="">请选择...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FormField>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  required?: boolean
  error?: string
  helpText?: string
}

export function TextareaField({ label, required, error, helpText, ...props }: TextareaProps) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText}>
      <textarea className="textarea-input" {...props} />
    </FormField>
  )
}

interface CheckboxGroupProps {
  label: string
  options: { value: string; label: string; description?: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  required?: boolean
  error?: string
}

export function CheckboxGroup({ label, options, selected, onChange, required, error }: CheckboxGroupProps) {
  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value])
    } else {
      onChange(selected.filter(v => v !== value))
    }
  }

  return (
    <FormField label={label} required={required} error={error}>
      <div className="checkbox-group">
        {options.map(opt => (
          <label key={opt.value} className="checkbox-item">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={e => handleChange(opt.value, e.target.checked)}
              className="checkbox-input"
            />
            <div className="checkbox-content">
              <span className="checkbox-label">{opt.label}</span>
              {opt.description && <span className="checkbox-description">{opt.description}</span>}
            </div>
          </label>
        ))}
      </div>
    </FormField>
  )
}

interface RadioGroupProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

export function RadioGroup({ label, options, value, onChange, required, error }: RadioGroupProps) {
  return (
    <FormField label={label} required={required} error={error}>
      <div className="radio-group">
        {options.map(opt => (
          <label key={opt.value} className="radio-item">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="radio-input"
            />
            <span className="radio-label">{opt.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  )
}
