import { APP_NAME } from "@/lib/brand";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getWindowState } from "@/lib/window";
import { UNIT_LABELS, formatDateStr } from "@/lib/format";
import type { Unit } from "@/db/schema";

const PAGE_W = 595.28; // A4 @ 72dpi
const PAGE_H = 841.89;
const MARGIN = 48;
const ROW_H = 18;
const BOTTOM_LIMIT = MARGIN + 60;

const L = {
  title: "Procurement Manifest",
  date: "Date",
  section1: "What to buy / prepare — combined requirements",
  product: "Product",
  needed: "Total needed",
  shops: "Retailers",
  section2: "Per-retailer delivery list",
  noOrders: "No orders for this window.",
  page: "Page",
} as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const win = await getWindowState();
  const windowDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : win.windowDate;

  const productTotals = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      unit: orderItems.unit,
      needed: sql<string>`sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}))`,
      shops: sql<number>`count(distinct ${orders.vendorId})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`)
    .groupBy(orderItems.productId, orderItems.productName, orderItems.unit);

  const vendorOrders = await db
    .select({
      orderId: orders.id,
      vendorName: users.businessName,
      address: users.address,
      phone: users.phone,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .where(sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`)
    .groupBy(orders.id, users.businessName, users.address, users.phone, orders.status);

  // One query for every line — grouped in JS (no per-order N+1).
  const allLines =
    vendorOrders.length === 0
      ? []
      : await db
          .select({
            orderId: orderItems.orderId,
            name: orderItems.productName,
            unit: orderItems.unit,
            qty: sql<string>`coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity})`,
          })
          .from(orderItems)
          .where(
            inArray(
              orderItems.orderId,
              vendorOrders.map((o) => o.orderId),
            ),
          );
  const linesByOrder = new Map<
    number,
    { name: string; unit: string; qty: string }[]
  >();
  for (const l of allLines) {
    const list = linesByOrder.get(l.orderId) ?? [];
    list.push({ name: l.name, unit: l.unit, qty: l.qty });
    linesByOrder.set(l.orderId, list);
  }
  const vendorItems = vendorOrders.map((o) => ({
    ...o,
    items: linesByOrder.get(o.orderId) ?? [],
  }));

  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const dark = rgb(0.15, 0.16, 0.15);
  const gray = rgb(0.42, 0.44, 0.42);
  const green = rgb(0.086, 0.396, 0.204);
  const line = rgb(0.83, 0.85, 0.83);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNo = 1;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    color = dark,
    font: PDFFont = regular,
  ) => page.drawText(s, { x, y: yy, size, font, color });

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pageNo += 1;
    text(`${L.page} ${pageNo}`, PAGE_W - MARGIN - 40, MARGIN - 20, 8, gray);
    y = PAGE_H - MARGIN;
  };

  const header = () => {
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 80,
      width: PAGE_W,
      height: 80,
      color: green,
    });
    text(L.title, MARGIN, PAGE_H - 44, 18, rgb(1, 1, 1), bold);
    text(
      `${L.date}: ${formatDateStr(windowDate)}  ·  ${APP_NAME} Wholesale`,
      MARGIN,
      PAGE_H - 64,
      10,
      rgb(0.88, 0.95, 0.9),
    );
    y = PAGE_H - 105;
  };

  const sectionTitle = (s: string) => {
    if (y < MARGIN + 80) newPage();
    text(s, MARGIN, y, 12, green, bold);
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: green,
    });
    y -= ROW_H + 4;
  };

  header();

  /* -------- Section 1: combined procurement table -------- */
  sectionTitle(L.section1);

  if (productTotals.length === 0) {
    text(L.noOrders, MARGIN, y, 10, gray);
  } else {
    const cols = [
      [L.product, MARGIN],
      [L.needed, MARGIN + 300],
      [L.shops, MARGIN + 430],
    ] as const;
    if (y < MARGIN + 60) newPage();
    for (const [label, x] of cols) text(label, x, y, 10, gray, bold);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: dark,
    });
    y -= ROW_H;

    for (const p of productTotals) {
      if (y < BOTTOM_LIMIT) newPage();
      text(p.name, MARGIN, y, 10);
      text(`${Number(p.needed)} ${UNIT_LABELS[p.unit as Unit]}`, MARGIN + 300, y, 10);
      text(String(p.shops), MARGIN + 430, y, 10);
      y -= ROW_H;
      page.drawLine({
        start: { x: MARGIN, y: y + 5 },
        end: { x: PAGE_W - MARGIN, y: y + 5 },
        thickness: 0.5,
        color: line,
      });
    }
  }

  y -= 24;

  /* -------- Section 2: per-retailer delivery lists -------- */
  sectionTitle(L.section2);

  for (const o of vendorItems) {
    if (y < MARGIN + 120) newPage();
    text(o.vendorName, MARGIN, y, 11, dark, bold);
    const contact = [o.address, o.phone].filter(Boolean).join(" · ");
    if (contact) text(contact.slice(0, 70), MARGIN, y - 13, 8.5, gray);
    y -= 32;

    for (const it of o.items) {
      if (y < BOTTOM_LIMIT) newPage();
      text(`•  ${it.name}`, MARGIN + 14, y, 10);
      text(`${Number(it.qty)} ${UNIT_LABELS[it.unit as Unit]}`, MARGIN + 320, y, 10);
      y -= ROW_H - 2;
    }
    y -= 10;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="manifest-${windowDate}.pdf"`,
    },
  });
}
