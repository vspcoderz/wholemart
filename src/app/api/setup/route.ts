import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    execSync("npx drizzle-kit push", { stdio: "pipe" });
    execSync("npx tsx scripts/seed.ts", { stdio: "pipe" });
    return NextResponse.json({ ok: true, message: "Setup complete. Admin: admin@wholesale.local / admin123" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
