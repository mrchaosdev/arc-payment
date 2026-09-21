/** How much of the code's width the mark covers. Shared with the raster export below
 * so a downloaded image matches the on-screen code exactly. */
export const QR_LOGO_RATIO = 0.22;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * Renders a link as a PNG and saves it, so a payer without a live camera —
 * or a payee who just wants to paste the code into a chat — has something to
 * send. Built at a fixed pixel size well above the on-screen SVG so it still
 * reads cleanly zoomed into on a phone.
 */
export async function downloadQrPng(value: string, filename: string) {
  const { default: encodeQR } = await import("qr");
  const grid = encodeQR(value, "raw", { border: 2, ecc: "high" });
  const modules = grid.length;
  const moduleSize = Math.max(8, Math.round(1024 / modules));
  const size = moduleSize * modules;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  grid.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
    }),
  );

  const markSide = Math.round(modules * QR_LOGO_RATIO) * moduleSize;
  const plateSide = markSide + moduleSize * 2;
  const platePos = (size - plateSide) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(platePos, platePos, plateSide, plateSide);

  const logo = await loadImage("/tokens/usdc.svg");
  const logoPos = (size - markSide) / 2;
  ctx.drawImage(logo, logoPos, logoPos, markSide, markSide);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode PNG"))), "image/png");
  });

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}
