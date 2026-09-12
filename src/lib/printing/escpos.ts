// Minimal ESC/POS byte-stream builder — transport-agnostic (works the same
// whether the bytes end up going over Bluetooth GATT, USB or Web Serial).
// No npm dependency: ESC/POS is a small, stable, well-documented command set
// and hand-rolling it keeps this module dependency-free and easy to audit.
//
// Accent handling: cheap Bluetooth thermal printers (the "mini impressoras"
// this feature targets) disagree wildly on which code page they default to.
// Rather than gamble on a single hard-coded byte table being right for every
// printer out there (a wrong table would silently print garbled accents on
// every single order), the SAFE default transliterates á/ã/ç/etc. to plain
// ASCII — always legible, on any printer. CP860 (the standard ESC/POS
// "Portuguese" code page) is offered as an opt-in for printers confirmed (via
// "Imprimir Teste", which prints a line of accented sample text) to render it
// correctly.
export type AccentMode = 'ascii' | 'cp860';

const ASCII_FALLBACK: Record<string, string> = {
  'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ç': 'c', 'ñ': 'n',
  'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
  'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
  'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
  'Ç': 'C', 'Ñ': 'N',
  'ª': 'a', 'º': 'o', '°': 'o'
};

// Standard Epson ESC/POS code page table, n=3 selects PC860 (Portuguese) —
// the widely-implemented constant across ESC/POS-compatible firmwares.
const CP860_CODEPAGE_SELECTOR = 3;
const CP860_MAP: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85,
  'Á': 0x86, 'ç': 0x87, 'ê': 0x88, 'Ê': 0x89, 'è': 0x8A, 'Í': 0x8B,
  'Ô': 0x8C, 'ì': 0x8D, 'Ã': 0x8E, 'Â': 0x8F, 'É': 0x90, 'À': 0x91,
  'È': 0x92, 'í': 0x93, 'Ó': 0x94, 'ó': 0x95, 'ú': 0x96, 'ñ': 0x97,
  'Ñ': 0x98, 'ª': 0xA6, 'º': 0xA7
};

function encodeChar(ch: string, mode: AccentMode): number {
  const code = ch.charCodeAt(0);
  if (code < 0x80) return code; // plain ASCII passes straight through
  if (mode === 'cp860' && CP860_MAP[ch] !== undefined) return CP860_MAP[ch];
  const fallback = ASCII_FALLBACK[ch];
  if (fallback) return fallback.charCodeAt(0);
  return 0x3F; // '?' — anything unmappable (emoji, etc.) never corrupts the stream
}

function encodeText(text: string, mode: AccentMode): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    bytes.push(encodeChar(ch, mode));
  }
  return bytes;
}

export type Align = 'left' | 'center' | 'right';

export class EscPosBuilder {
  private bytes: number[] = [];
  private mode: AccentMode;

  constructor(mode: AccentMode = 'ascii') {
    this.mode = mode;
    this.bytes.push(0x1B, 0x40); // ESC @ — initialize printer
    if (mode === 'cp860') {
      this.bytes.push(0x1B, 0x74, CP860_CODEPAGE_SELECTOR); // ESC t 3
    }
  }

  align(align: Align): this {
    const n = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    this.bytes.push(0x1B, 0x61, n); // ESC a n
    return this;
  }

  bold(on: boolean): this {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0); // ESC E n
    return this;
  }

  doubleSize(on: boolean): this {
    this.bytes.push(0x1D, 0x21, on ? 0x11 : 0x00); // GS ! n
    return this;
  }

  text(str: string): this {
    this.bytes.push(...encodeText(str, this.mode));
    return this;
  }

  line(str = ''): this {
    this.text(str);
    this.newline();
    return this;
  }

  newline(): this {
    this.bytes.push(0x0A);
    return this;
  }

  // A full-width dashed rule — width in characters (58mm printers: ~32
  // cols at font A; 80mm: ~48 cols). Caller passes the right width.
  separator(width: number, char = '-'): this {
    return this.line(char.repeat(width));
  }

  feed(lines = 1): this {
    this.bytes.push(0x1B, 0x64, lines); // ESC d n
    return this;
  }

  cutPaper(): this {
    this.bytes.push(0x1D, 0x56, 0x00); // GS V 0 — full cut
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}
