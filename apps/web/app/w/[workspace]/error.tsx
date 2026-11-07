'use client';

import { Alert, Button } from '@agency-os/ui';

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <Alert tone="danger" title="This page didn’t load">
      <p className="mb-3">Check your connection, then try again.</p>
      <Button onClick={reset}>Try again</Button>
    </Alert>
  );
}
