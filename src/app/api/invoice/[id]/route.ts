import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { PDFDocument } from "pdf-lib";
import {
  drawInvoicePage,
  invoiceFonts,
  invoiceNoFor,
} from "@/lib/invoice-pdf";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = (
    await db
      .select({ order: orders, vendor: users })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.vendorId))
      .where(eq(orders.id, orderId))
      .limit(1)
  )[0];
  if (!row) return new NextResponse("Not found", { status: 404 });

  // Vendors may only see their own invoices
  if (session.user.role === "VENDOR" && row.order.vendorId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const pdf = await PDFDocument.create();
  const fonts = await invoiceFonts(pdf);
  drawInvoicePage(pdf, fonts, row.order, row.vendor, items);
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoiceNoFor(row.order)}.pdf"`,
    },
  });
}
