import { NextResponse } from "next/server";
import { version } from "../../../../package.json";

// Baked at build time: tells you exactly which build is live in prod.
export const dynamic = "force-static";

const BUILT_AT = new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    version,
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.COMMIT_SHA ??
      null,
    builtAt: BUILT_AT,
  });
}
