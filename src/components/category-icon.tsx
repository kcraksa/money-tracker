/** Ikon kategori (emoji dari data) dalam kotak berwarna lembut supaya tampil rapi & konsisten. */
export function CategoryIcon({ icon, size = "md" }: { icon: string; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "h-9 w-9 text-lg", md: "h-11 w-11 text-xl", lg: "h-12 w-12 text-2xl" }[size];
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-primary-soft ${cls}`} aria-hidden>
      {icon}
    </span>
  );
}
