import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  if (process.env.SETUP_DONE === "true") {
    return NextResponse.json({ ok: true, message: "Already set up" });
  }

  try {
    execSync("npx drizzle-kit push", { stdio: "pipe" });
    execSync("npx tsx scripts/seed.ts", { stdio: "pipe" });
    return NextResponse.json({ ok: true, message: "Setup complete. Admin: admin@wholesale.local / admin123" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
