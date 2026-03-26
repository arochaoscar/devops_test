/**
 * Tests for server-side reCAPTCHA verification.
 *
 * Covers:
 *   - Bypass when RECAPTCHA_SECRET_KEY is not configured
 *   - Success response from Google API
 *   - Failure response from Google API
 *   - Missing "success" field in response
 */

import { verifyRecaptcha } from "../recaptcha";

// Mock global fetch to intercept calls to Google's reCAPTCHA API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("verifyRecaptcha", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return true when RECAPTCHA_SECRET_KEY is not set", async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;

    const result = await verifyRecaptcha("any-token");

    expect(result).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return true when Google responds with success", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    const result = await verifyRecaptcha("valid-token");

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "secret=test-secret&response=valid-token",
      }
    );
  });

  it("should return false when Google responds with failure", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });

    const result = await verifyRecaptcha("invalid-token");

    expect(result).toBe(false);
  });

  it("should return false when success field is missing", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const result = await verifyRecaptcha("some-token");

    expect(result).toBe(false);
  });
});
