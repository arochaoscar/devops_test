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

export async function getGreetings(): Promise<Greeting[]> {
  return prisma.greeting.findMany({
    select: { name: true, createdAt: true, ipAddress: true, location: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createGreeting(
  name: string,
  recaptchaToken: string | null
): Promise<ActionResult> {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required", greetings: [] };
  }

  if (name.trim().length > 255) {
    return { error: "Name is too long", greetings: [] };
  }

  const isHuman = await verifyRecaptcha(recaptchaToken || "");
  if (!isHuman) {
    return { error: "reCAPTCHA verification failed", greetings: [] };
  }

  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "0.0.0.0";

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
      // Geolocation is best-effort
    }
  }

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
