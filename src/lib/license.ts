import { createHmac } from "crypto";

export function verifyLicenseKey(key: string, secret: string): boolean {
  const cleaned = key.replace(/-/g, "").toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(cleaned)) return false;

  const rawDate = cleaned.substring(0, 6);
  const hmacPart = cleaned.substring(6);

  const expectedHmac = createHmac("sha256", secret)
    .update(rawDate)
    .digest("hex")
    .substring(0, 10)
    .toUpperCase();

  return hmacPart === expectedHmac;
}

export function extractExpiry(key: string): Date | null {
  const cleaned = key.replace(/-/g, "").toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(cleaned)) return null;

  const rawDate = cleaned.substring(0, 6);
  const yy = parseInt(rawDate.substring(0, 2), 10);
  const mm = parseInt(rawDate.substring(2, 4), 10) - 1;
  const dd = parseInt(rawDate.substring(4, 6), 10);

  const date = new Date(2000 + yy, mm, dd);
  if (isNaN(date.getTime())) return null;
  return date;
}
