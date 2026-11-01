// Builds the photo for a Sushi AI Studio combo: the combo's product photos
// side by side in one high-quality image. 1600x900 (16:9) matches the wide
// product cards on the cardápio, so each half stays close to square and the
// food barely gets cropped.

const WIDTH = 1600;
const HEIGHT = 900;
const JPEG_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    // Needed so a remote (http) photo doesn't taint the canvas; data: URLs
    // (how uploaded photos are stored) are unaffected.
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Draws `img` filling the box (object-fit: cover), centered.
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Orange "+" badge marking where two items meet.
function drawPlusBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FF6A00';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  const bar = r * 0.23;
  const len = r * 1.03;
  ctx.fillRect(cx - len / 2, cy - bar / 2, len, bar);
  ctx.fillRect(cx - bar / 2, cy - len / 2, bar, len);
}

const SEAM = 'rgba(255,255,255,0.9)';

// Up to 4 photos: 1 = full, 2 = side by side, 3 = three columns, 4 = 2x2
// grid. Resolves to a JPEG data URL, or — if the photos can't be combined
// (none loaded, or a remote photo blocks canvas export) — the first photo.
export async function buildComboImage(imageUrls: string[]): Promise<string> {
  const urls = imageUrls.filter(Boolean).slice(0, 4);
  const images = (await Promise.all(urls.map(loadImage))).filter((i): i is HTMLImageElement => !!i);
  if (images.length === 0) return urls[0] || '';

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return urls[0];
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#0C0A08';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (images.length === 1) {
    drawCover(ctx, images[0], 0, 0, WIDTH, HEIGHT);
  } else if (images.length === 4) {
    const w = WIDTH / 2;
    const h = HEIGHT / 2;
    images.forEach((img, i) => drawCover(ctx, img, (i % 2) * w, Math.floor(i / 2) * h, w, h));
    ctx.fillStyle = SEAM;
    ctx.fillRect(w - 3, 0, 6, HEIGHT);
    ctx.fillRect(0, h - 3, WIDTH, 6);
    drawPlusBadge(ctx, w, h, 56);
  } else {
    // 2 or 3 side-by-side columns, each with a seam + "+" between them.
    const cols = images.length;
    const w = WIDTH / cols;
    images.forEach((img, i) => drawCover(ctx, img, i * w, 0, w, HEIGHT));
    for (let i = 1; i < cols; i++) {
      ctx.fillStyle = SEAM;
      ctx.fillRect(i * w - 3, 0, 6, HEIGHT);
    }
    for (let i = 1; i < cols; i++) drawPlusBadge(ctx, i * w, HEIGHT / 2, cols === 2 ? 62 : 52);
  }

  try {
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return urls[0];
  }
}
