export function rupiah(n: number): string {
  const sign = n < 0 ? "-" : "";
  // Spasi tak-terputus supaya "Rp" dan angkanya tidak pernah terpisah di akhir baris.
  return `${sign}Rp\u00A0${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}

/** 45600 -> "45.600 km". */
export const kmText = (n: number) => `${Math.round(n).toLocaleString("id-ID")}\u00A0km`;

/** 2 -> "2", 1.5 -> "1,5". */
export function qty(n: number): string {
  return String(Number(Number(n).toFixed(2))).replace(".", ",");
}
