/**
 * Server-side reCAPTCHA Verification
 *
 * Verifies a reCAPTCHA v2 token with Google's API. Called from the
 * createGreeting server action before inserting a new record.
 *
 * Bypass behavior: if RECAPTCHA_SECRET_KEY is not set (e.g., in local
 * development or test environments), verification is skipped and all
 * submissions are allowed. This avoids requiring reCAPTCHA setup for
 * local development while enforcing it in deployed environments.
 *
 * @param token - The reCAPTCHA response token from the client
 * @returns true if the token is valid (or if reCAPTCHA is not configured)
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // No secret configured — bypass verification (dev/test environments)
  if (!secret) return true;

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await response.json();
  return data.success === true;
}
