import Link from 'next/link';

export default function PortalNotFound() {
  return (
    <div className="grid gap-3">
      <h1 className="text-title-lg">This page isn’t in your portal</h1>
      <p className="text-body text-muted-foreground">
        It may belong to someone else, or the link is old. Your projects, payments and messages are
        on the home page.
      </p>
      <Link href="../" className="text-body-medium">
        Go to your home page
      </Link>
    </div>
  );
}
