// Server only. Renders a PDF document to a download response.
import { PLAN_DETAILS } from '@agency-os/core';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { WorkspaceSettings } from '../data/types';
import { registerFonts } from './fonts';
import type { PdfBrand } from './parts';

export function pdfBrand(settings: WorkspaceSettings): PdfBrand {
  return {
    name: settings.name,
    logoUrl: settings.logo?.url ?? null,
    poweredBy: !PLAN_DETAILS[settings.plan].ownBranding,
  };
}

/** "OSS/26-27/017" → "OSS-26-27-017.pdf": safe in every file system. */
export function pdfFileName(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${safe || 'document'}.pdf`;
}

export async function pdfResponse(
  /** A component whose root is a react-pdf <Document>. */
  doc: ReactElement,
  name: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): Promise<Response> {
  registerFonts();
  const buffer = await renderToBuffer(doc as ReactElement<DocumentProps>);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${pdfFileName(name)}"`,
      // Invoices and signed records are private: never cache them anywhere shared.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
