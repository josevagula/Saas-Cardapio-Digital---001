// Converts the establishment's logo (visualConfig.logoUrl) into an ESC/POS
// monochrome raster image — printed centered above the order code, per the
// "Personalização" logo the restaurant already uploaded. Thermal printers
// have no way to render a JPEG/PNG directly; GS v 0 (raster bit image) is
// the standard ESC/POS command for sending a 1-bit-per-pixel bitmap.

export interface LogoRaster {
  widthBytes: number;
  heightPx: number;
  data: Uint8Array;
}

export function dotsForPaperWidth(paperWidth: 58 | 80): number {
  return paperWidth === 80 ? 576 : 384;
}

// "Tamanho médio" — centered by the caller via EscPosBuilder.align('center').
// Smaller than a literal half of the printable width on purpose: total
// current draw while printing a raster image scales with how many dots the
// head fires, which scales ~quadratically with image size (width * height).
// Weak Bluetooth thermal printers have been observed browning out on a
// half-width logo; a little over a third keeps it clearly recognizable
// while meaningfully cutting the peak/sustained draw during that segment.
const MEDIUM_LOGO_SIZE_FACTOR = 0.35;

async function loadImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error('Falha ao baixar a logo.');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao decodificar a logo.'));
      el.src = objectUrl;
    });
  } finally {
    // Safe once the promise above resolves — the browser has already
    // decoded the bitmap into the <img> element by the time 'load' fires.
    URL.revokeObjectURL(objectUrl);
  }
}

// Returns null (never throws) on anything that goes wrong — no logo
// configured, a network/CORS failure, a corrupt image — so a receipt still
// prints normally, just without the logo, instead of failing the whole job.
export async function buildLogoRaster(logoUrl: string | undefined, paperWidth: 58 | 80): Promise<LogoRaster | null> {
  if (!logoUrl) return null;
  try {
    const img = await loadImage(logoUrl);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const maxDots = dotsForPaperWidth(paperWidth);
    const targetWidthPx = Math.round(maxDots * MEDIUM_LOGO_SIZE_FACTOR);
    const widthPx = Math.max(8, Math.ceil(targetWidthPx / 8) * 8); // byte-aligned, GS v 0 packs 8 px/byte
    const scale = widthPx / img.naturalWidth;
    const heightPx = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.drawImage(img, 0, 0, widthPx, heightPx);

    const imageData = ctx.getImageData(0, 0, widthPx, heightPx).data;

    // Grayscale first (transparent pixels read as white background, since
    // they were already composited over the white fill above).
    const gray = new Float32Array(widthPx * heightPx);
    for (let y = 0; y < heightPx; y++) {
      for (let x = 0; x < widthPx; x++) {
        const i = (y * widthPx + x) * 4;
        gray[y * widthPx + x] = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
      }
    }

    // Floyd–Steinberg dithering — a flat brightness cutoff crushes any
    // colorful/mid-tone logo (which is most real logos) into a solid black
    // block, since whole regions can sit just under the threshold. Diffusing
    // the quantization error to neighboring pixels instead reproduces
    // gradients and color regions as a dot pattern, the same technique
    // actual receipt-printer software uses for logo images.
    const widthBytes = widthPx / 8;
    const data = new Uint8Array(widthBytes * heightPx);
    for (let y = 0; y < heightPx; y++) {
      for (let x = 0; x < widthPx; x++) {
        const idx = y * widthPx + x;
        const oldVal = gray[idx];
        const isBlack = oldVal < 128;
        if (isBlack) {
          const byteIndex = y * widthBytes + (x >> 3);
          data[byteIndex] |= (0x80 >> (x & 7));
        }
        const error = oldVal - (isBlack ? 0 : 255);
        if (x + 1 < widthPx) gray[idx + 1] += error * 7 / 16;
        if (y + 1 < heightPx) {
          if (x > 0) gray[idx - 1 + widthPx] += error * 3 / 16;
          gray[idx + widthPx] += error * 5 / 16;
          if (x + 1 < widthPx) gray[idx + 1 + widthPx] += error * 1 / 16;
        }
      }
    }
    return { widthBytes, heightPx, data };
  } catch {
    return null;
  }
}
