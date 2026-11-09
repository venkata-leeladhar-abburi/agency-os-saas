import { Skeleton } from '@agency-os/ui';

export default function Loading() {
  return (
    <div className="grid gap-4" role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
