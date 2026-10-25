/** Mode sederhana: menyembunyikan poin, level, hari berturut-turut, dan tantangan. Disimpan per perangkat. */
export const SIMPLE_COOKIE = "mt-simple";
export const isSimpleValue = (v: string | undefined) => v === "1";
