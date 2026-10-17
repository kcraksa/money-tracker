export function rupiah(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}

/** 2 -> "2", 1.5 -> "1,5". */
export function qty(n: number): string {
  return String(Number(Number(n).toFixed(2))).replace(".", ",");
}
