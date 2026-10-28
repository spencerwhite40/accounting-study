/** Text normalisation + fuzzy match for fill-the-blank answers. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9%$. ]+/g, " ")
    .replace(/\b(the|a|an|of|to|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let left = i;
    let diag = i - 1;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j] as number;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(up + 1, left + 1, diag + cost);
      prev[j - 1] = left;
      diag = up;
      left = val;
    }
    prev[b.length] = left;
  }
  return prev[b.length] as number;
}

export function matches(input: string, answers: string[]): boolean {
  const x = normalize(input);
  if (!x) return false;
  return answers.some((a) => {
    const y = normalize(a);
    if (x === y) return true;
    // numeric answers must be exact
    if (/^[\d$.,%]+$/.test(y)) return false;
    // one typo allowed on longer answers only; internal/external failure differ by 2
    const tol = y.length >= 8 ? 1 : 0;
    return levenshtein(x, y) <= tol;
  });
}

export function numberClose(input: string, answer: number): boolean {
  const cleaned = input.replace(/[$,%\s]/g, "");
  if (!/\d/.test(cleaned)) return false;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return false;
  const tol = Math.max(0.01, Math.abs(answer) * 0.002);
  return Math.abs(n - answer) <= tol;
}

export function fmt(n: number, unit: string): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? abs.toLocaleString("en-US", { maximumFractionDigits: 2 }) : abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const sign = n < 0 ? "-" : "";
  switch (unit) {
    case "$": return `${sign}$${s}`;
    case "$/unit": return `${sign}$${s} per unit`;
    case "$/hr": return `${sign}$${s} per hour`;
    case "units": return `${sign}${s} units`;
    case "%": return `${sign}${s}%`;
    default: return `${sign}${s}`;
  }
}
