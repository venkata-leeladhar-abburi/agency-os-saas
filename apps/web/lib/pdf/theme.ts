// PDF colours and type, from the tokens. The agency's colour is the accent when it's
// readable on white; otherwise the Agency OS violet.
import { StyleSheet } from '@react-pdf/renderer';
import { reviewBrandColour } from '../branding';
import { tokenColour } from '../token-colours';
import { parseHexColour } from '@agency-os/core';

export function pdfColours(brandColour: string | null) {
  const brand = brandColour ? parseHexColour(brandColour) : null;
  return {
    text: tokenColour('foreground'),
    muted: tokenColour('muted-foreground'),
    border: tokenColour('border'),
    strong: tokenColour('border-strong'),
    surface: tokenColour('muted'),
    accent: brand && reviewBrandColour(brand).usable ? brand : tokenColour('primary'),
    info: tokenColour('info'),
    warning: tokenColour('warning'),
  };
}

export type PdfColours = ReturnType<typeof pdfColours>;

export function pdfStyles(c: PdfColours) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Geist',
      fontSize: 9.5,
      color: c.text,
      paddingTop: 40,
      paddingBottom: 56,
      paddingHorizontal: 44,
    },
    // Line height goes on paragraphs only: set on the page (and so inherited) it stops
    // react-pdf drawing the page numbers in the footer.
    para: { lineHeight: 1.45 },
    row: { flexDirection: 'row' },
    between: { flexDirection: 'row', justifyContent: 'space-between' },
    muted: { color: c.muted },
    small: { fontSize: 8, color: c.muted },
    mono: { fontFamily: 'Geist Mono' },
    strong: { fontWeight: 600 },
    medium: { fontWeight: 500 },
    overline: {
      fontSize: 8,
      fontWeight: 600,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.accent,
    },
    title: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 },
    heading: { fontSize: 11.5, fontWeight: 600, marginBottom: 4 },
    rule: { borderBottomWidth: 0.75, borderBottomColor: c.border },
    tag: {
      fontSize: 7.5,
      fontWeight: 600,
      color: c.muted,
      borderWidth: 0.75,
      borderColor: c.strong,
      borderRadius: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    box: { backgroundColor: c.surface, borderRadius: 4, padding: 8 },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 44,
      right: 44,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7.5,
      color: c.muted,
    },
  });
}

export type PdfStyles = ReturnType<typeof pdfStyles>;
