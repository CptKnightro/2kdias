'use client'

import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** Label + control wrapper. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

const baseInput =
  'skeuo-inset w-full rounded-lg bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/40 disabled:opacity-50'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(baseInput, props.className)} />
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="numeric" {...props} type="number" className={cn(baseInput, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(baseInput, 'resize-y', props.className)} />
}

export type Option = { label: string; value: string }

export function Select({
  options,
  placeholder,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <select {...props} className={cn(baseInput, 'appearance-none pr-8', className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Checkbox-chip multi-select for hasMany relationships. Values are string ids. */
export function MultiSelect({
  options,
  value,
  onChange,
  empty = 'No options',
}: {
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  empty?: string
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              on ? 'skeuo-btn text-foreground' : 'skeuo-inset text-foreground/60 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Color swatch + hex text input, kept in sync. */
export function ColorInput({
  value,
  onChange,
  name,
}: {
  value: string
  onChange: (v: string) => void
  name?: string
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#DF2604'
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        className="skeuo h-9 w-10 shrink-0 cursor-pointer rounded-lg bg-transparent p-1"
      />
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(baseInput, 'font-mono')}
        placeholder="#DF2604"
      />
    </div>
  )
}

export function SubmitButton({
  pending,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={cn(
        'skeuo-btn inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60',
        className,
      )}
    >
      {pending && <CircleNotch weight="bold" className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

/** Small ghost/danger button for row actions. */
export function MiniButton({
  variant = 'ghost',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'danger' }) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
        variant === 'danger'
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
        className,
      )}
    />
  )
}
