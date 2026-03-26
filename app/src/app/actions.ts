/**
 * Server Actions
 *
 * Next.js Server Actions that handle greeting CRUD operations.
 * These run server-side only — they are never sent to the browser.
 *
 * getGreetings()  — Fetches all greetings ordered by newest first.
 * createGreeting() — Validates input, verifies reCAPTCHA, resolves
 *                    the visitor's IP geolocation, creates the record,
 *                    and returns the updated list.
 */

"use server";

import { headers } from "next/headers";
import prisma from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";

export interface Greeting {
  name: string;
  createdAt: Date;
  ipAddress: string;
  location: string | null;
}

interface ActionResult {
  error?: string;
  greetings: Greeting[];
}

/** Fetch all greetings from the database, newest first */
export async function getGreetings(): Promise<Greeting[]> {
  return prisma.greeting.findMany({
    select: { name: true, createdAt: true, ipAddress: true, location: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new greeting record.
 *
 * Flow:
 *   1. Validate name (required, max 255 chars)
 *   2. Verify reCAPTCHA token with Google
 *   3. Extract visitor IP from x-forwarded-for (set by ALB)
 *   4. Resolve IP to city/region/country via ip-api.com (best-effort)
 *   5. Insert record into PostgreSQL via Prisma
 *   6. Return updated greetings list
 */
export async function createGreeting(
  name: string,
  recaptchaToken: string | null
): Promise<ActionResult> {
  // --- Input validation ---
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required", greetings: [] };
  }

  if (name.trim().length > 255) {
    return { error: "Name is too long", greetings: [] };
  }

  // --- reCAPTCHA verification ---
  const isHuman = await verifyRecaptcha(recaptchaToken || "");
  if (!isHuman) {
    return { error: "reCAPTCHA verification failed", greetings: [] };
  }

  // --- IP extraction ---
  // ALB sets x-forwarded-for with the client IP as the first entry
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "0.0.0.0";

  // --- Geolocation ---
  // Strip IPv6 prefix and detect local/private IPs to skip geo lookup
  const cleanIp = ip.replace(/^::ffff:/, "");
  const isLocalIp =
    cleanIp === "0.0.0.0" ||
    cleanIp === "127.0.0.1" ||
    ip === "::1" ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("172.") ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("169.254.");

  let location: string | null = null;

  if (isLocalIp) {
    location = "Local Network";
  } else {
    // Best-effort geolocation — failure is silently ignored
    try {
      const geoRes = await fetch(
        `http://ip-api.com/json/${cleanIp}?fields=city,regionName,country`
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.city) {
          location = [geo.city, geo.regionName, geo.country]
            .filter(Boolean)
            .join(", ");
        }
      }
    } catch {
      // Geolocation is best-effort — don't block the greeting
    }
  }

  // --- Persist and return ---
  await prisma.greeting.create({
    data: {
      name: name.trim(),
      ipAddress: ip,
      location,
    },
  });

  const greetings = await prisma.greeting.findMany({
    select: { name: true, createdAt: true, ipAddress: true, location: true },
    orderBy: { createdAt: "desc" },
  });

  return { greetings };
}
