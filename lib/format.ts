// Shared formatting helpers for the workspace. Moved here (out of
// lib/app-data.ts and lib/real-data.ts) so both the mock module and the
// real data layer can use the same functions without importing each other.

/** `1234.5` → "1,234.50". No `$` prefix — amounts are USDC and say so. */
export function usd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** `12500` → "12k"; `1500` → "1.5k". Anything under 1000 is printed as-is. */
export function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/** `"ABCDEF...WXYZ"` → "ABCDEF…WXYZ". "—" for an empty address. */
export function shortAddr(a: string, head = 6, tail = 4): string {
  return !a ? "—" : a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
}
