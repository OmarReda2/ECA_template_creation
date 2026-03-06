import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Pencil, Trash2 } from 'lucide-react';

const iconClassName = 'h-4 w-4 shrink-0';

const baseIconOnly = 'h-8 w-8';
const baseWithLabel = 'h-8 gap-1.5 px-2.5';
const baseCommon = 'inline-flex items-center justify-center rounded-md border border-transparent text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 text-sm font-medium';
const baseClasses = `${baseCommon} ${baseIconOnly}`;
const baseClassesWithLabel = `${baseCommon} ${baseWithLabel}`;
const dangerIconOnly = 'h-8 w-8';
const dangerWithLabel = 'h-8 gap-1.5 px-2.5';
const dangerCommon = 'inline-flex items-center justify-center rounded-md border border-transparent text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 text-sm font-medium';
const dangerClasses = `${dangerCommon} ${dangerIconOnly}`;
const dangerClassesWithLabel = `${dangerCommon} ${dangerWithLabel}`;

export function IconView({ className = '' }: { className?: string }) {
  return <Eye className={className || iconClassName} size={16} aria-hidden />;
}

export function IconEdit({ className = '' }: { className?: string }) {
  return <Pencil className={className || iconClassName} size={16} aria-hidden />;
}

export function IconExport({ className = '' }: { className?: string }) {
  return <Download className={className || iconClassName} size={16} aria-hidden />;
}

export function IconDelete({ className = '' }: { className?: string }) {
  return <Trash2 className={className || iconClassName} size={16} aria-hidden />;
}

export function IconArrowLeft({ className = '' }: { className?: string }) {
  return <ArrowLeft className={className || iconClassName} size={16} aria-hidden />;
}

interface ActionButtonBaseProps {
  'aria-label': string;
  children: ReactNode;
  /** Optional visible label (e.g. "View", "Edit schema", "Export"). Renders icon + label. */
  label?: ReactNode;
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
  const { 'aria-label': ariaLabel, children, label, className = '' } = props;
  const withLabel = label != null;
  const classes = `${withLabel ? baseClassesWithLabel : baseClasses} ${className}`;
  const content = withLabel ? (
    <>
      {children}
      <span>{label}</span>
    </>
  ) : (
    children
  );
  if (props.as === 'link') {
    return (
      <Link to={props.to} className={classes} aria-label={ariaLabel}>
        {content}
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
      {content}
    </button>
  );
}

export function DangerActionButton({
  'aria-label': ariaLabel,
  onClick,
  disabled,
  children,
  label,
  className = '',
}: {
  'aria-label': string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Optional visible label (e.g. "Delete"). Renders icon + label. */
  label?: ReactNode;
  className?: string;
}) {
  const withLabel = label != null;
  const classes = `${withLabel ? dangerClassesWithLabel : dangerClasses} ${className}`;
  const content = withLabel ? (
    <>
      {children}
      <span>{label}</span>
    </>
  ) : (
    children
  );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {content}
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
