import { APP_NAME } from "@/lib/brand";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { UNIT_LABELS, ORDER_STATUS_LABELS, formatDateStr } from "@/lib/format";
import type { Order, OrderItem, Unit, User } from "@/db/schema";

// ₹ (U+20B9) isn't in the WinAnsi encoding of standard PDF fonts → "Rs."
export const rs = (n: number) =>
  `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PAGE_W = 595.28; // A4 @ 72dpi
export const PAGE_H = 841.89;
const MARGIN = 48;
const ROW_H = 18;
// pdf-lib y=0 is the page BOTTOM; rows are drawn top-down, so a new page is
// needed once y approaches the bottom margin.
const BOTTOM_LIMIT = MARGIN + 60;

export type InvoiceFonts = { bold: PDFFont; regular: PDFFont };

export async function invoiceFonts(pdf: PDFDocument): Promise<InvoiceFonts> {
  const [bold, regular] = await Promise.all([
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.Helvetica),
  ]);
  return { bold, regular };
}

const green = rgb(0.1, 0.5, 0.22);
const dark = rgb(0.12, 0.12, 0.12);
const gray = rgb(0.45, 0.45, 0.45);
const line = rgb(0.85, 0.85, 0.85);
const white = rgb(1, 1, 1);

export function invoiceNoFor(order: Pick<Order, "id" | "windowDate">) {
  return `GG-${order.windowDate.replaceAll("-", "")}-${String(order.id).padStart(4, "0")}`;
}

/**
 * Draw one order's invoice into the PDF, always starting on a fresh page.
 * Returns the order total. A long order may spill onto continuation pages.
 */
export function drawInvoicePage(
  pdf: PDFDocument,
  fonts: InvoiceFonts,
  order: Order,
  vendor: User,
  items: OrderItem[],
): number {
  const supplied = (q: string | null, fallback: string) => q ?? fallback;

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    font: PDFFont = fonts.regular,
    color = dark,
  ) => page.drawText(s, { x, y: yy, size, font, color });

  function drawTableHeader() {
    const cols = [
      ["#", MARGIN, 20],
      ["Item", MARGIN + 24, 220],
      ["Qty", MARGIN + 250, 80],
      ["Rate", MARGIN + 330, 90],
      ["Amount", MARGIN + 440, 80],
    ] as const;
    text(cols[0][0], cols[0][1], y, 9, fonts.bold, gray);
    text(cols[1][0], cols[1][1], y, 9, fonts.bold, gray);
    text(cols[2][0], cols[2][1], y, 9, fonts.bold, gray);
    text(cols[3][0], cols[3][1], y, 9, fonts.bold, gray);
    text(cols[4][0], cols[4][1], y, 9, fonts.bold, gray);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: green,
    });
    y -= ROW_H;
  }

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    drawTableHeader();
  };

  /* ---------- Header ---------- */
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 110,
    width: PAGE_W,
    height: 110,
    color: green,
  });
  text(APP_NAME, MARGIN, PAGE_H - 52, 24, fonts.bold, white);
  text(
    "Wholesale Vegetables · English Vegetables · Fruits",
    MARGIN,
    PAGE_H - 70,
    10,
    fonts.regular,
    rgb(0.9, 1, 0.92),
  );
  text("TAX INVOICE", MARGIN, PAGE_H - 92, 12, fonts.bold, white);

  const invoiceNo = invoiceNoFor(order);
  text(`Invoice: ${invoiceNo}`, MARGIN, PAGE_H - 135, 10, fonts.bold);
  text(
    `Order window: ${formatDateStr(order.windowDate)}`,
    MARGIN,
    PAGE_H - 150,
    10,
    fonts.regular,
    gray,
  );
  text(
    `Status: ${ORDER_STATUS_LABELS[order.status]}`,
    MARGIN,
    PAGE_H - 165,
    10,
    fonts.regular,
    gray,
  );
  text(
    `Placed: ${order.placedAt.toLocaleString("en-IN")}`,
    MARGIN,
    PAGE_H - 180,
    10,
    fonts.regular,
    gray,
  );

  text("Billed to", PAGE_W - MARGIN - 200, PAGE_H - 135, 9, fonts.bold, gray);
  text(vendor.businessName, PAGE_W - MARGIN - 200, PAGE_H - 150, 11, fonts.bold);
  if (vendor.address)
    text(
      vendor.address.slice(0, 40),
      PAGE_W - MARGIN - 200,
      PAGE_H - 164,
      9,
      fonts.regular,
      dark,
    );
  if (vendor.phone)
    text(
      `Ph: ${vendor.phone}`,
      PAGE_W - MARGIN - 200,
      PAGE_H - 177,
      9,
      fonts.regular,
      dark,
    );
  text(vendor.email, PAGE_W - MARGIN - 200, PAGE_H - 190, 9, fonts.regular, gray);

  y = PAGE_H - 215;

  /* ---------- Items table (auto page-breaks for 40+ rows) ---------- */
  drawTableHeader();

  let grandTotal = 0;
  items.forEach((it, idx) => {
    if (y < BOTTOM_LIMIT) newPage();

    const qty = Number(supplied(it.confirmedQuantity, it.quantity));
    const amount = qty * Number(it.unitPrice);
    grandTotal += amount;

    const adjusted =
      it.confirmedQuantity !== null &&
      Number(it.confirmedQuantity) !== Number(it.quantity);
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
  text("TOTAL (Pay on Delivery)", MARGIN + 250, y, 11, fonts.bold);
  text(rs(grandTotal), MARGIN + 440, y, 12, fonts.bold, green);

  /* ---------- Footer ---------- */
  const noteY = Math.max(y - 50, MARGIN + 30);
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 56 },
    end: { x: PAGE_W - MARGIN, y: MARGIN + 56 },
    thickness: 0.5,
    color: line,
  });
  if (order.adminNote) {
    text(`Note: ${order.adminNote}`, MARGIN, noteY, 9, fonts.regular, gray);
  }
  text(
    "Payment collected on delivery (cash / UPI). Quantities marked (adjusted) were confirmed by the supplier.",
    MARGIN,
    MARGIN + 40,
    8,
    fonts.regular,
    gray,
  );
  text(
    `Thank you for your business — ${APP_NAME} Wholesale`,
    MARGIN,
    MARGIN + 26,
    9,
    fonts.bold,
    dark,
  );

  return grandTotal;
}
