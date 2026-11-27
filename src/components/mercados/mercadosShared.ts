// Formatação, imagem (PNG), PDF, impressão e WhatsApp do módulo Mercados.
// Tudo é gerado no navegador, na hora — nada vai para o Storage.
//
// A imagem é desenhada direto num <canvas> (sem html2canvas: ele não
// entende as cores oklch() do Tailwind v4 usadas no projeto).

export const brl = (centavos: number): string =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// "42,00" / "42" / "1.126,50" -> centavos. Retorna null se inválido.
export const parseReaisToCentavos = (texto: string): number | null => {
  if (texto.includes('-')) return null;
  const limpo = texto.replace(/[^\d.,]/g, '');
  if (!limpo) return null;
  let norm = limpo;
  if (limpo.includes(',')) norm = limpo.replace(/\./g, '').replace(',', '.');
  else if ((limpo.match(/\./g) || []).length > 1) norm = limpo.replace(/\./g, '');
  const v = Number(norm);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
};

export const centavosToInput = (c: number): string => (c / 100).toFixed(2).replace('.', ',');

export const dataBR = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const hojeISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const diasAtrasISO = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface PedidoExport {
  mercadoNome: string;
  cidade: string | null;
  data: string; // ISO
  linhas: { nome: string; qtd: number; preco_centavos: number }[];
}

const titulo = (p: PedidoExport) => `${p.mercadoNome}${p.cidade ? ` - ${p.cidade}` : ''}`.toUpperCase();
const linhasValidas = (p: PedidoExport) => p.linhas.filter(l => l.qtd > 0);
const totalDe = (p: PedidoExport) => linhasValidas(p).reduce((s, l) => s + l.qtd * l.preco_centavos, 0);

const nomeArquivo = (p: PedidoExport, ext: string) =>
  `pedido-${p.mercadoNome}-${dataBR(p.data).replace(/\//g, '-')}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase() + `.${ext}`;

// ---------- Canvas (visual de planilha, limpo) ----------

export function desenharPedido(p: PedidoExport): HTMLCanvasElement {
  const linhas = linhasValidas(p);
  const W = 820;
  const PAD = 32;
  const HEADER_H = 96;
  const TH_H = 44;
  const ROW_H = 42;
  const TOTAL_H = 56;
  const LINE_H = 20;
  const scale = 2;
  const font = (peso: number, px: number) => `${peso} ${px}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const x0 = PAD;
  const tw = W - PAD * 2;
  // Colunas: Produto | Qtd. | Custo Unit. | Total
  const cols = [tw * 0.5, tw * 0.12, tw * 0.19, tw * 0.19];
  const colX = [x0, x0 + cols[0], x0 + cols[0] + cols[1], x0 + cols[0] + cols[1] + cols[2], x0 + tw];

  // Nomes longos quebram em até 2 linhas (a linha cresce) em vez de cortar.
  const medidor = document.createElement('canvas').getContext('2d')!;
  medidor.font = font(500, 15);
  const nomes = linhas.map(l => quebrar(medidor, l.nome, cols[0] - 24, 2));
  const alturas = nomes.map(n => Math.max(ROW_H, n.length * LINE_H + 18));
  const H = PAD + HEADER_H + TH_H + alturas.reduce((s, h) => s + h, 0) + TOTAL_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Cabeçalho
  let y = PAD;
  ctx.fillStyle = '#C2410C';
  ctx.fillRect(x0, y, tw, HEADER_H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = font(800, 24);
  ctx.fillText(ajustar(ctx, titulo(p), tw - 40), x0 + 20, y + 38);
  ctx.font = font(500, 16);
  ctx.fillText(`Data: ${dataBR(p.data)}`, x0 + 20, y + 70);
  y += HEADER_H;

  // Cabeçalho da tabela
  ctx.fillStyle = '#FFEDD5';
  ctx.fillRect(x0, y, tw, TH_H);
  ctx.fillStyle = '#7C2D12';
  ctx.font = font(700, 15);
  const th = ['Produto', 'Qtd.', 'Custo Unit.', 'Total'];
  th.forEach((t, i) => celula(ctx, t, colX[i], colX[i + 1], y, TH_H, i === 0 ? 'left' : i === 1 ? 'center' : 'right'));
  grade(ctx, colX, y, TH_H);
  y += TH_H;

  // Linhas
  linhas.forEach((l, idx) => {
    const rh = alturas[idx];
    if (idx % 2 === 1) {
      ctx.fillStyle = '#FAFAF9';
      ctx.fillRect(x0, y, tw, rh);
    }
    ctx.fillStyle = '#1C1917';
    ctx.font = font(500, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const n = nomes[idx];
    const topo = y + rh / 2 - ((n.length - 1) * LINE_H) / 2;
    n.forEach((linha, i) => ctx.fillText(linha, colX[0] + 12, topo + i * LINE_H));
    ctx.font = font(700, 15);
    celula(ctx, String(l.qtd), colX[1], colX[2], y, rh, 'center');
    ctx.font = font(500, 15);
    celula(ctx, brl(l.preco_centavos), colX[2], colX[3], y, rh, 'right');
    ctx.font = font(700, 15);
    celula(ctx, brl(l.qtd * l.preco_centavos), colX[3], colX[4], y, rh, 'right');
    grade(ctx, colX, y, rh);
    y += rh;
  });

  // Total
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(x0, y, tw, TOTAL_H);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 18);
  celula(ctx, 'TOTAL', colX[0], colX[3], y, TOTAL_H, 'left');
  ctx.fillStyle = '#FDBA74';
  ctx.font = font(800, 22);
  celula(ctx, brl(totalDe(p)), colX[2], colX[4], y, TOTAL_H, 'right');

  return canvas;
}

function ajustar(ctx: CanvasRenderingContext2D, texto: string, max: number): string {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

// Quebra o texto por palavras em até `maxLinhas`; a última leva "…" se sobrar.
function quebrar(ctx: CanvasRenderingContext2D, texto: string, max: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let atual = '';
  for (let i = 0; i < palavras.length; i++) {
    const tentativa = atual ? `${atual} ${palavras[i]}` : palavras[i];
    if (ctx.measureText(tentativa).width <= max || !atual) {
      atual = tentativa;
    } else {
      out.push(atual);
      atual = palavras[i];
      if (out.length === maxLinhas - 1) {
        atual = palavras.slice(i).join(' ');
        break;
      }
    }
  }
  if (atual) out.push(atual);
  return out.map(l => ajustar(ctx, l, max));
}

function celula(ctx: CanvasRenderingContext2D, texto: string, x1: number, x2: number, y: number, h: number, align: CanvasTextAlign) {
  const pad = 12;
  const t = ajustar(ctx, texto, x2 - x1 - pad * 2);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x = align === 'left' ? x1 + pad : align === 'center' ? (x1 + x2) / 2 : x2 - pad;
  ctx.fillText(t, x, y + h / 2);
}

function grade(ctx: CanvasRenderingContext2D, colX: number[], y: number, h: number) {
  ctx.strokeStyle = '#E7E5E4';
  ctx.lineWidth = 1;
  ctx.strokeRect(colX[0] + 0.5, y + 0.5, colX[colX.length - 1] - colX[0] - 1, h - 1);
  for (let i = 1; i < colX.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(colX[i] + 0.5, y);
    ctx.lineTo(colX[i] + 0.5, y + h);
    ctx.stroke();
  }
}

const canvasBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'));

const baixar = (blob: Blob, nome: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export async function baixarPNG(p: PedidoExport) {
  baixar(await canvasBlob(desenharPedido(p)), nomeArquivo(p, 'png'));
}

// Compartilha a imagem direto (no celular abre WhatsApp etc.). Retorna
// false quando o navegador não suporta compartilhar arquivos.
export async function compartilharPNG(p: PedidoExport): Promise<boolean> {
  const blob = await canvasBlob(desenharPedido(p));
  const file = new File([blob], nomeArquivo(p, 'png'), { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title: titulo(p) });
  } catch (e: any) {
    if (e?.name !== 'AbortError') throw e;
  }
  return true;
}

export async function baixarPDF(p: PedidoExport) {
  const { jsPDF } = await import('jspdf');
  const canvas = desenharPedido(p);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const margin = 12;
  const w = pageW - margin * 2;
  const h = (canvas.height / canvas.width) * w;
  const pageH = 297 - margin * 2;
  if (h <= pageH) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, w, h);
  } else {
    // Pedido muito longo: fatia a imagem em páginas.
    const sliceH = Math.floor((pageH / w) * canvas.width);
    for (let sy = 0, page = 0; sy < canvas.height; sy += sliceH, page++) {
      const part = document.createElement('canvas');
      part.width = canvas.width;
      part.height = Math.min(sliceH, canvas.height - sy);
      part.getContext('2d')!.drawImage(canvas, 0, sy, canvas.width, part.height, 0, 0, canvas.width, part.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(part.toDataURL('image/png'), 'PNG', margin, margin, w, (part.height / part.width) * w);
    }
  }
  pdf.save(nomeArquivo(p, 'pdf'));
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function imprimirPedido(p: PedidoExport) {
  const linhas = linhasValidas(p);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo(p))}</title>
<style>
  body{font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#1C1917;margin:24px}
  h1{font-size:20px;margin:0 0 4px}
  p{margin:0 0 16px;color:#57534E}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{border:1px solid #D6D3D1;padding:8px 10px}
  th{background:#FFEDD5;text-align:left}
  .n{text-align:right;white-space:nowrap}.c{text-align:center}
  tfoot td{font-weight:800;font-size:16px;background:#F5F5F4}
</style></head><body>
<h1>${esc(titulo(p))}</h1><p>Data: ${dataBR(p.data)}</p>
<table><thead><tr><th>Produto</th><th class="c">Qtd.</th><th class="n">Custo Unit.</th><th class="n">Total</th></tr></thead>
<tbody>${linhas.map(l => `<tr><td>${esc(l.nome)}</td><td class="c">${l.qtd}</td><td class="n">${brl(l.preco_centavos)}</td><td class="n">${brl(l.qtd * l.preco_centavos)}</td></tr>`).join('')}</tbody>
<tfoot><tr><td colspan="3">TOTAL</td><td class="n">${brl(totalDe(p))}</td></tr></tfoot></table>
</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

export function textoWhatsApp(p: PedidoExport): string {
  const linhas = linhasValidas(p);
  return [
    `*${titulo(p)}*`,
    `Data: ${dataBR(p.data)}`,
    '',
    ...linhas.map(l => `• ${l.qtd}x ${l.nome} — ${brl(l.preco_centavos)} = ${brl(l.qtd * l.preco_centavos)}`),
    '',
    `*TOTAL: ${brl(totalDe(p))}*`
  ].join('\n');
}

// wa.me exige só dígitos com DDI; número brasileiro sem DDI ganha o 55.
export function linkWhatsApp(telefone: string | null, texto: string): string {
  let d = (telefone || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
