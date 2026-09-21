import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { PDFDocument } from "pdf-lib";
import {
  drawInvoicePage,
  invoiceFonts,
} from "@/lib/invoice-pdf";

/**
 * Bulk invoices: one PDF, each selected order starts on a fresh page.
 * Admin only. Usage: /api/invoices/bulk?ids=3,7,9
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100); // cap: keeps the response fast and small
  if (ids.length === 0) {
    return new NextResponse("Select at least one order.", { status: 400 });
  }

  const rows = await db
    .select({ order: orders, vendor: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .where(inArray(orders.id, ids))
    .orderBy(asc(users.businessName), asc(orders.id));

  if (rows.length === 0) return new NextResponse("Not found", { status: 404 });

  const allItems = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.order.id),
      ),
    );
  const byOrder = new Map<number, typeof allItems>();
  for (const it of allItems) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it);
    byOrder.set(it.orderId, list);
  }

  const pdf = await PDFDocument.create();
  const fonts = await invoiceFonts(pdf);
  for (const r of rows) {
    drawInvoicePage(pdf, fonts, r.order, r.vendor, byOrder.get(r.order.id) ?? []);
  }
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoices-${rows.length}-orders.pdf"`,
    },
  });
}
