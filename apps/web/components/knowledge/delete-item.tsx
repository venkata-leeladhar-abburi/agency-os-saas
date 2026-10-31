'use client';

import { Trash } from '@phosphor-icons/react';
import { Button, Dialog, DialogContent } from '@agency-os/ui';
import { useState } from 'react';
import { Submit } from '@/components/workspace/form-bits';

export function DeleteItem({ action, title }: { action: () => Promise<void>; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" icon={Trash} onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Delete “${title}”?`}
          description="It's removed for everyone who can see it, including clients."
        >
          <form action={action} className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Keep it</Button>
            <Submit variant="destructive">Delete item</Submit>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
