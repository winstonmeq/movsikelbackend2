'use client';

import React from 'react';

export const colors = {
  primary: '#0f766e',
  primaryDark: '#115e59',
  border: '#e2e8f0',
  muted: '#64748b',
  bg: '#f1f5f9',
  card: '#ffffff',
  danger: '#dc2626',
  warn: '#d97706',
  ok: '#16a34a'
};

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 18,
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'warn';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const palette: Record<string, React.CSSProperties> = {
    primary: { background: colors.primary, color: '#fff', border: 'none' },
    danger: { background: colors.danger, color: '#fff', border: 'none' },
    warn: { background: colors.warn, color: '#fff', border: 'none' },
    ghost: { background: '#fff', color: colors.primary, border: `1px solid ${colors.border}` }
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...palette[variant],
        padding: '8px 14px',
        borderRadius: 9,
        fontWeight: 600,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 9,
        border: `1px solid ${colors.border}`,
        fontSize: 14,
        boxSizing: 'border-box',
        ...props.style
      }}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: colors.ok,
    suspended: colors.warn,
    banned: colors.danger,
    completed: colors.ok,
    cancelled: colors.danger,
    requested: colors.muted,
    accepted: colors.primary,
    arrived: colors.primary,
    in_progress: colors.warn
  };
  const color = map[status] || colors.muted;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}1a`,
        textTransform: 'capitalize'
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function RoleTabs({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 13px',
            borderRadius: 9,
            border: `1px solid ${value === opt.value ? colors.primary : colors.border}`,
            background: value === opt.value ? colors.primary : '#fff',
            color: value === opt.value ? '#fff' : colors.muted,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
