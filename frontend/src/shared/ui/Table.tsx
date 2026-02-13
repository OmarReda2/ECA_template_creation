import { type ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

/** Use inside Card for a single clean border (no double card + table border). */
export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white">
      <table className={`min-w-full divide-y divide-neutral-200 ${className}`}>{children}</table>
    </div>
  );
}

export function TableHead({ children, className = '' }: TableProps) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className = '' }: TableProps) {
  return <tbody className={`divide-y divide-neutral-200 bg-white ${className}`}>{children}</tbody>;
}

export function TableRow({ children, className = '' }: TableProps) {
  return (
    <tr className={`transition-colors hover:bg-neutral-50 ${className}`}>{children}</tr>
  );
}

export function TableTh({ children, className = '' }: TableProps) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableTd({ children, className = '' }: TableProps) {
  return <td className={`px-4 py-3 text-sm text-neutral-900 ${className}`}>{children}</td>;
}
