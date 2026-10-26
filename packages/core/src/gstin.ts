const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** GST state codes in use: 01 to 38, and 97 (other territory). */
export function isValidStateCode(code: string): boolean {
  const n = Number(code);
  return /^\d{2}$/.test(code) && ((n >= 1 && n <= 38) || n === 97);
}

/** The check character for the first 14 characters of a GSTIN. */
export function gstinCheckCharacter(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(first14[i] as string);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36] as string;
}

export type GstinResult =
  { ok: true; gstin: string; stateCode: string } | { ok: false; error: string };

/** Validates a GSTIN. Accepts lower case and spaces; returns it upper-cased. */
export function validateGstin(input: string): GstinResult {
  const gstin = input.replace(/\s+/g, '').toUpperCase();
  if (gstin.length !== 15) {
    return { ok: false, error: `A GSTIN has 15 characters. This one has ${gstin.length}.` };
  }
  const stateCode = gstin.slice(0, 2);
  if (!isValidStateCode(stateCode)) {
    return {
      ok: false,
      error: `A GSTIN starts with a state code from 01 to 38. ${stateCode} isn't one. Check the first two digits.`,
    };
  }
  if (!PATTERN.test(gstin)) {
    return {
      ok: false,
      error:
        "This GSTIN doesn't follow the usual pattern (for example 37ABCDE1234F1Z5). Check for a typo.",
    };
  }
  if (gstinCheckCharacter(gstin.slice(0, 14)) !== gstin[14]) {
    return { ok: false, error: "This GSTIN's last character doesn't match. Check for a typo." };
  }
  return { ok: true, gstin, stateCode };
}

/** GST state and union territory names by code, for place of supply on invoices. */
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (before division)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

/** "Karnataka (29)", or the bare code if it isn't one. */
export function stateLabel(code: string): string {
  const name = GST_STATES[code];
  return name ? `${name} (${code})` : code;
}
