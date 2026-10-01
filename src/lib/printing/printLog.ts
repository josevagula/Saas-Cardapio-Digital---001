// Diagnostic log for the printing module. Every entry goes to the browser
// console AND to a small ring buffer in localStorage, so a failure on the
// restaurant's own tablet/PC can still be inspected after the fact (e.g.
// "a impressora desligou no meio") without having had devtools open at the
// time. To read it: open the console on that device and run
// `__zushyPrintDiag()` — returns the entries as text, ready to copy.
//
// Per-chunk entries use console.debug (hidden unless "Verbose" is enabled in
// devtools) so normal console output stays readable.

const DIAG_KEY = 'zushy_print_diag_log';
const MAX_DIAG_ENTRIES = 400;

type Level = 'debug' | 'info' | 'warn' | 'error';

let buffer: string[] = (() => {
  try {
    const raw = localStorage.getItem(DIAG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Batched so per-chunk logging doesn't hit localStorage dozens of times per receipt.
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      localStorage.setItem(DIAG_KEY, JSON.stringify(buffer));
    } catch {
      // Storage full/unavailable — console output still has everything.
    }
  }, 500);
}

export function printLog(level: Level, message: string, details?: unknown) {
  const ts = new Date().toISOString();
  const detailStr = details === undefined ? '' : ` ${typeof details === 'string' ? details : JSON.stringify(details)}`;
  const line = `${ts} [${level}] ${message}${detailStr}`;
  const consoleFn = level === 'debug' ? console.debug : level === 'info' ? console.info : level === 'warn' ? console.warn : console.error;
  consoleFn(`[printing] ${message}`, ...(details === undefined ? [] : [details]));
  // Chunk-level noise stays console-only; the persisted buffer keeps the
  // job/segment/connection timeline, which is what matters for diagnosis.
  if (level === 'debug') return;
  buffer.push(line);
  if (buffer.length > MAX_DIAG_ENTRIES) buffer = buffer.slice(buffer.length - MAX_DIAG_ENTRIES);
  scheduleFlush();
}

if (typeof window !== 'undefined') {
  (window as any).__zushyPrintDiag = () => buffer.join('\n');
}
