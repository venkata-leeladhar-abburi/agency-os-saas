'use client';

import { Checkbox, Card } from '@agency-os/ui';
import { useActionState } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { NOTIFICATION_CATEGORIES, type WorkspaceSettings } from '@/lib/data/types';
import { EMPTY_FORM } from '@/lib/form-state';
import { savePrefsAction } from './actions';

export function NotificationPrefs({
  slug,
  prefs,
}: {
  slug: string;
  prefs: WorkspaceSettings['notificationPrefs'];
}) {
  const [state, action] = useActionState(savePrefsAction.bind(null, slug), EMPTY_FORM);
  return (
    <Card
      id="notifications"
      title="Notifications"
      description="What you hear about, in the app and by email. Emails go out once email sending is set up."
    >
      <form action={action} className="grid gap-4">
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">Notification settings</caption>
          <thead>
            <tr className="text-caption text-muted-foreground">
              <th scope="col" className="pb-2 text-left font-medium">
                When
              </th>
              <th scope="col" className="w-20 pb-2 text-center font-medium">
                In app
              </th>
              <th scope="col" className="w-20 pb-2 text-center font-medium">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_CATEGORIES.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  {c.name}
                </th>
                <td className="py-2.5 text-center">
                  <span className="inline-flex">
                    <Checkbox
                      name={`inApp.${c.id}`}
                      aria-label={`${c.name}: in app`}
                      defaultChecked={prefs[c.id]?.inApp}
                    />
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span className="inline-flex">
                    <Checkbox
                      name={`email.${c.id}`}
                      aria-label={`${c.name}: email`}
                      defaultChecked={prefs[c.id]?.email}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-end gap-3">
          {state.done ? (
            <p role="status" className="text-body-sm text-muted-foreground">
              Notification settings saved.
            </p>
          ) : null}
          <Submit variant="secondary">Save notification settings</Submit>
        </div>
      </form>
    </Card>
  );
}
