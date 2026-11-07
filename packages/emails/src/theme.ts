// Email colours and type from the tokens. Email clients ignore CSS variables, so each
// value is written inline.
import { tokens, tokenColour } from '@agency-os/tokens';

export const emailColours = {
  page: tokenColour('background'),
  card: tokenColour('card'),
  text: tokenColour('foreground'),
  muted: tokenColour('muted-foreground'),
  border: tokenColour('border'),
  surface: tokenColour('muted'),
  primary: tokenColour('primary'),
  primaryText: tokenColour('primary-foreground'),
};

export const emailFont = tokens.type.families.sans;
