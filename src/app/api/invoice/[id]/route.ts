import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { UNIT_LABELS, ORDER_STATUS_LABELS, formatDateStr } from "@/lib/format";
import type { Unit } from "@/db/schema";

// ₹ (U+20B9) isn't in the WinAnsi encoding of standard PDF fonts → "Rs."
const rs = (n: number) =>
  `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAGE_W = 595.28; // A4 @ 72dpi
const PAGE_H = 841.89;
const MARGIN = 48;
const ROW_H = 18;
// pdf-lib y=0 is the page BOTTOM; rows are drawn top-down, so a new page is
// needed once y approaches the bottom margin.
const BOTTOM_LIMIT = MARGIN + 60;

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
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const green = rgb(0.1, 0.5, 0.22);
  const dark = rgb(0.12, 0.12, 0.12);
  const gray = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.85, 0.85, 0.85);

  const supplied = (q: string | null, fallback: string) => q ?? fallback;

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    font: PDFFont = regular,
    color = dark,
  ) => page.drawText(s, { x, y: yy, size, font, color });

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    drawTableHeader();
  };

  function drawTableHeader() {
    const cols = [
      ["#", MARGIN, 20],
      ["Item", MARGIN + 24, 220],
      ["Qty", MARGIN + 250, 80],
      ["Rate", MARGIN + 330, 90],
      ["Amount", MARGIN + 440, 80],
    ] as const;
    text(cols[0][0], cols[0][1], y, 9, bold, gray);
    text(cols[1][0], cols[1][1], y, 9, bold, gray);
    text(cols[2][0], cols[2][1], y, 9, bold, gray);
    text(cols[3][0], cols[3][1], y, 9, bold, gray);
    text(cols[4][0], cols[4][1], y, 9, bold, gray);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: green,
    });
    y -= ROW_H;
  }

  /* ---------- Header ---------- */
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 110,
    width: PAGE_W,
    height: 110,
    color: green,
  });
  text("GreenGrocer", MARGIN, PAGE_H - 52, 24, bold, rgb(1, 1, 1));
  text("Wholesale Vegetables · English Vegetables · Fruits", MARGIN, PAGE_H - 70, 10, regular, rgb(0.9, 1, 0.92));
  text("TAX INVOICE", MARGIN, PAGE_H - 92, 12, bold, rgb(1, 1, 1));

  const invoiceNo = `GG-${row.order.windowDate.replaceAll("-", "")}-${String(row.order.id).padStart(4, "0")}`;
  text(`Invoice: ${invoiceNo}`, MARGIN, PAGE_H - 135, 10, bold);
  text(`Order window: ${formatDateStr(row.order.windowDate)}`, MARGIN, PAGE_H - 150, 10, regular, gray);
  text(`Status: ${ORDER_STATUS_LABELS[row.order.status]}`, MARGIN, PAGE_H - 165, 10, regular, gray);
  text(`Placed: ${row.order.placedAt.toLocaleString("en-IN")}`, MARGIN, PAGE_H - 180, 10, regular, gray);

  text("Billed to", PAGE_W - MARGIN - 200, PAGE_H - 135, 9, bold, gray);
  text(row.vendor.businessName, PAGE_W - MARGIN - 200, PAGE_H - 150, 11, bold);
  if (row.vendor.address)
    text(row.vendor.address.slice(0, 40), PAGE_W - MARGIN - 200, PAGE_H - 164, 9, regular, dark);
  if (row.vendor.phone)
    text(`Ph: ${row.vendor.phone}`, PAGE_W - MARGIN - 200, PAGE_H - 177, 9, regular, dark);
  text(row.vendor.email, PAGE_W - MARGIN - 200, PAGE_H - 190, 9, regular, gray);

  y = PAGE_H - 215;

  /* ---------- Items table (auto page-breaks for 40+ rows) ---------- */
  drawTableHeader();

  let grandTotal = 0;
  items.forEach((it, idx) => {
    if (y < BOTTOM_LIMIT) newPage();

    const qty = Number(supplied(it.confirmedQuantity, it.quantity));
    const amount = qty * Number(it.unitPrice);
    grandTotal += amount;

    const adjusted = it.confirmedQuantity !== null && Number(it.confirmedQuantity) !== Number(it.quantity);
    text(String(idx + 1), MARGIN, y, 10);
    text(it.productName + (adjusted ? " (adjusted)" : ""), MARGIN + 24, y, 10);
    text(`${qty} ${UNIT_LABELS[it.unit as Unit]}`, MARGIN + 250, y, 10);
    text(rs(Number(it.unitPrice)), MARGIN + 330, y, 10);
    text(rs(amount), MARGIN + 440, y, 10);
    y -= ROW_H;
    page.drawLine({
      start: { x: MARGIN, y: y + 5 },
      end: { x: PAGE_W - MARGIN, y: y + 5 },
      thickness: 0.5,
      color: line,
    });
  });

  if (y < BOTTOM_LIMIT) newPage();

  /* ---------- Totals ---------- */
  y -= 12;
  page.drawLine({
    start: { x: MARGIN + 330, y: y + 14 },
    end: { x: PAGE_W - MARGIN, y: y + 14 },
    thickness: 1,
    color: dark,
  });
  text("TOTAL (Pay on Delivery)", MARGIN + 250, y, 11, bold);
  text(rs(grandTotal), MARGIN + 440, y, 12, bold, green);

  /* ---------- Footer ---------- */
  const noteY = Math.max(y - 50, MARGIN + 30);
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 56 },
    end: { x: PAGE_W - MARGIN, y: MARGIN + 56 },
    thickness: 0.5,
    color: line,
  });
  if (row.order.adminNote) {
    text(`Note: ${row.order.adminNote}`, MARGIN, noteY, 9, regular, gray, );
  }
  text(
    "Payment collected on delivery (cash / UPI). Quantities marked (adjusted) were confirmed by the supplier.",
    MARGIN,
    MARGIN + 40,
    8,
    regular,
    gray,
  );
  text(
    `Thank you for your business — GreenGrocer Wholesale`,
    MARGIN,
    MARGIN + 26,
    9,
    bold,
    dark,
  );

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoiceNo}.pdf"`,
    },
  });
}
