# InvoiceSummary

The money part of an invoice.

- **Shows:** number (mono), status, line items with SAC codes, the tax lines and the total.
- **`tax` options:**
  - `intra`: CGST 9% + SGST 9%
  - `inter`: IGST 18%
  - `lut`: export of services under LUT, 0% IGST
  - `none`: no GST
- **INR totals** are also written in words (lakh and crore). Foreign-currency invoices show the exchange rate on the invoice date.
- **Tax logic** must be reviewed by a chartered accountant before launch.
