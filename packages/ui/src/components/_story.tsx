import type { ReactNode } from 'react';

/** Layout helpers for stories only. */
export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-overline-caps text-muted-foreground">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex max-w-content flex-col gap-6 ${className ?? ''}`}>{children}</div>;
}
