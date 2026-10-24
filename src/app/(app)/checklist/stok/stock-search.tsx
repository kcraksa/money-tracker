"use client";

import { useState } from "react";
import { Search } from "@/components/icons";
import { matchesQuery } from "@/lib/shopping";

/** Kotak cari untuk daftar stok: menyembunyikan <li data-name> yang tidak cocok, tanpa merender ulang daftar server. */
export function StockSearch({ listId }: { listId: string }) {
  const [query, setQuery] = useState("");
  const [empty, setEmpty] = useState(false);

  function onChange(value: string) {
    setQuery(value);
    const rows = document.querySelectorAll<HTMLElement>(`#${listId} > li[data-name]`);
    let visible = 0;
    rows.forEach((li) => {
      const ok = matchesQuery(li.dataset.name ?? "", value);
      li.hidden = !ok;
      if (ok) visible++;
    });
    setEmpty(value.trim() !== "" && visible === 0);
  }

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search" value={query} onChange={(e) => onChange(e.target.value)} enterKeyHint="search"
          className="input pl-10" placeholder="Cari barang di stok rumah" aria-label="Cari stok"
        />
      </div>
      {empty && <p className="card text-center text-sm text-muted">Tidak ada barang “{query.trim()}” di stok.</p>}
    </>
  );
}
