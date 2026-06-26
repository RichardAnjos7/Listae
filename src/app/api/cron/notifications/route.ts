import { NextResponse } from "next/server";
import {
  runMonthlySummary,
  runPersonalDropReminders,
  runRepurchaseReminders,
  runWeeklyDigest,
} from "@/lib/notifications/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const fromHeader = header?.replace(/^Bearer\s+/i, "");
  const fromQuery = new URL(request.url).searchParams.get("secret");
  return fromHeader === secret || fromQuery === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const job = new URL(request.url).searchParams.get("job") ?? "daily";
  const result: Record<string, number> = {};

  if (job === "daily" || job === "all") {
    result.repurchase = await runRepurchaseReminders();
    result.price_drop = await runPersonalDropReminders();
  }
  if (job === "weekly" || job === "all") {
    result.weekly_digest = await runWeeklyDigest();
  }
  if (job === "monthly" || job === "all") {
    result.monthly_summary = await runMonthlySummary();
  }

  return NextResponse.json({ ok: true, job, sent: result });
}
