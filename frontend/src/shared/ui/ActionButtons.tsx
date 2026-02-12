import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const iconSize = 16;
const buttonSize = 'h-8 w-8';
const baseClasses = `inline-flex items-center justify-center rounded-md border border-transparent text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${buttonSize}`;
const dangerClasses = `inline-flex items-center justify-center rounded-md border border-transparent text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${buttonSize}`;

export function IconView({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEdit({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconExport({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconDelete({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

interface ActionButtonBaseProps {
  'aria-label': string;
  children: ReactNode;
  className?: string;
}

interface ActionButtonAsButton extends ActionButtonBaseProps {
  as: 'button';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

interface ActionButtonAsLink extends ActionButtonBaseProps {
  as: 'link';
  to: string;
}

type ActionButtonProps = ActionButtonAsButton | ActionButtonAsLink;

export function ActionButton(props: ActionButtonProps) {
  const { 'aria-label': ariaLabel, children, className = '' } = props;
  const classes = `${baseClasses} ${className}`;
  if (props.as === 'link') {
    return (
      <Link to={props.to} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function DangerActionButton({
  'aria-label': ariaLabel,
  onClick,
  disabled,
  children,
  className = '',
}: {
  'aria-label': string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${dangerClasses} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/** Small text + icon link for "Back" style actions; no underline. */
export function ActionLink({
  to,
  children,
  className = '',
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${className}`}
    >
      {children}
    </Link>
  );
}
