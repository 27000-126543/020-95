import type { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  required?: boolean
}

export function FormSection({ title, subtitle, children, required = false }: FormSectionProps) {
  return (
    <div className="form-section">
      <div className="section-header">
        <h3 className="section-title">
          {title}
          {required && <span className="required-mark">*</span>}
        </h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      <div className="section-content">
        {children}
      </div>
    </div>
  )
}
