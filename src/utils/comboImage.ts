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

// Resolves to a JPEG data URL, or — if the photos can't be combined (none
// loaded, or a remote photo blocks canvas export) — the first usable photo.
export async function buildComboImage(imageUrls: string[]): Promise<string> {
  const urls = imageUrls.filter(Boolean).slice(0, 2);
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
  } else {
    const half = WIDTH / 2;
    drawCover(ctx, images[0], 0, 0, half, HEIGHT);
    drawCover(ctx, images[1], half, 0, half, HEIGHT);

    // Thin seam + "+" badge so it clearly reads as two items together.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(half - 3, 0, 6, HEIGHT);
    const r = 62;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(half, HEIGHT / 2, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6A00';
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    const bar = 14;
    const len = 64;
    ctx.fillRect(half - len / 2, HEIGHT / 2 - bar / 2, len, bar);
    ctx.fillRect(half - bar / 2, HEIGHT / 2 - len / 2, bar, len);
  }

  try {
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return urls[0];
  }
}
