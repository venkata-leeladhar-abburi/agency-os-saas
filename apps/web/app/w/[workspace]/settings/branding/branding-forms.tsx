'use client';

import { formatRatio, parseHexColour } from '@agency-os/core';
import { Alert, Badge, Button, Input } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { brandStyleSheet, reviewBrandColour } from '@/lib/branding';
import type { WorkspaceSettings } from '@/lib/data/types';
import { EMPTY_FORM } from '@/lib/form-state';
import { tokenColour } from '@/lib/token-colours';
import { removeLogoAction, saveBrandColourAction, uploadLogoAction } from './actions';

// Sample input shown in the field and its help text, not a colour the interface uses.
const SAMPLE_HEX = '#0F766E'; // design-rules-ignore: example text for the user to copy

export function LogoForm({
  slug,
  logo,
  workspaceName,
}: {
  slug: string;
  logo: WorkspaceSettings['logo'];
  workspaceName: string;
}) {
  const [state, action] = useActionState(uploadLogoAction.bind(null, slug), EMPTY_FORM);
  return (
    <div className="grid gap-4">
      {state.done ? (
        <Alert tone="success" title="Logo saved">
          The portal and new PDFs show it.
        </Alert>
      ) : null}
      <div className="flex min-h-16 items-center gap-4 rounded-lg border border-border bg-background p-4">
        {logo ? (
          // A data URL kept in example mode, or a signed storage URL: next/image can't optimise either.
          <img
            src={logo.url}
            alt={`${workspaceName} logo`}
            className="h-12 w-auto max-w-48 object-contain"
          />
        ) : (
          <p className="text-body text-muted-foreground">
            No logo yet. The portal and PDFs show “{workspaceName}” in text.
          </p>
        )}
      </div>
      <form action={action} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <label htmlFor="logo" className="text-body-sm font-medium">
            {logo ? 'Replace the logo' : 'Upload a logo'}
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg"
            aria-invalid={state.errors?.logo ? true : undefined}
            aria-describedby={state.errors?.logo ? 'logo-error' : undefined}
            className="min-w-0 text-body file:mr-3 file:h-control-md file:cursor-pointer file:rounded-md file:border file:border-border file:bg-card file:px-3 file:text-body-medium file:text-foreground"
          />
          {state.errors?.logo ? (
            <p id="logo-error" className="text-body-sm text-danger">
              {state.errors.logo}
            </p>
          ) : null}
        </div>
        <Submit variant="secondary">Save logo</Submit>
      </form>
      {logo ? (
        <form action={removeLogoAction.bind(null, slug)}>
          <Button type="submit" variant="ghost" size="sm">
            Remove the logo
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function BrandColourForm({
  slug,
  saved,
  savedUsable,
}: {
  slug: string;
  saved: string | null;
  savedUsable: boolean;
}) {
  const [state, action] = useActionState(saveBrandColourAction.bind(null, slug), EMPTY_FORM);
  const [typed, setTyped] = useState(state.values?.brandColour ?? saved?.toUpperCase() ?? '');
  const colour = parseHexColour(typed);
  const review = colour ? reviewBrandColour(colour) : null;
  const sheet = brandStyleSheet(colour);
  const picker = colour ?? tokenColour('primary');

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="The colour wasn’t saved" />
      {state.done ? (
        <Alert tone="success" title={saved ? 'Brand colour saved' : 'Back to the Agency OS colour'}>
          {saved && !savedUsable
            ? 'It’s saved, but the portal keeps the Agency OS violet until you pick a darker shade.'
            : 'The portal uses it now.'}
        </Alert>
      ) : saved && !savedUsable ? (
        <Alert tone="warning" title="Your portal is using the Agency OS violet">
          White text on {saved.toUpperCase()} is {formatRatio(reviewBrandColour(saved).ratio)}.
          Buttons need 4.5:1 to be readable, so the portal keeps the Agency OS colour. Pick a darker
          shade of your colour.
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
        <Input
          label="Hex colour"
          name="brandColour"
          optional
          className="font-mono uppercase"
          containerClassName="w-44"
          placeholder={SAMPLE_HEX}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          error={state.errors?.brandColour}
          hint="Leave it empty for the Agency OS violet."
        />
        <label className="grid gap-1.5 text-body-sm font-medium">
          Colour picker
          <input
            type="color"
            value={picker}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            className="h-control-md w-14 cursor-pointer rounded-md border border-input bg-card p-1"
          />
        </label>
      </div>
      <p aria-live="polite" className="text-body-sm">
        {review ? (
          review.usable ? (
            <span className="text-success">
              White text on it: {formatRatio(review.ratio)}. Readable, so the portal can use it.
            </span>
          ) : (
            <span className="text-warning">
              White text on it: {formatRatio(review.ratio)}, below the 4.5:1 buttons need. The
              portal would keep the Agency OS violet.
            </span>
          )
        ) : (
          <span className="text-muted-foreground">
            {typed ? `Type 6 digits, like ${SAMPLE_HEX}.` : 'Showing the Agency OS violet.'}
          </span>
        )}
      </p>
      <section aria-label="Preview" className="grid gap-2">
        <h3 className="text-body-sm font-medium text-muted-foreground">Preview</h3>
        {sheet ? <style>{sheet}</style> : null}
        <div
          data-brand
          inert
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-4"
        >
          <Button variant="primary">Pay ₹1,18,000</Button>
          <Badge tone="brand">Needs you</Badge>
        </div>
      </section>
      <div className="flex justify-end">
        <Submit>Save colour</Submit>
      </div>
    </form>
  );
}
