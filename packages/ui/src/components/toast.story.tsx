import { Button } from './button';
import { notify, Toaster } from './toast';

/** Story helper: shows real toasts through notify(). */
export function Notify() {
  return (
    <div className="min-h-[240px] p-6">
      <Toaster />
      <Button
        variant="primary"
        onClick={() =>
          notify({
            title: 'Proposal sent',
            description: 'Kite & Co will get an email and a WhatsApp link.',
            action: {
              label: 'Undo',
              onClick: () => notify({ tone: 'info', title: 'Proposal moved back to draft' }),
            },
          })
        }
      >
        Send proposal
      </Button>
    </div>
  );
}
