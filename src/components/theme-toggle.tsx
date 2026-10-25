"use client";

import { useSyncExternalStore } from "react";
import { Segmented } from "./segmented";

type Choice = "system" | "light" | "dark";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

function current(): Choice {
  const set = document.documentElement.dataset.theme;
  return set === "dark" || set === "light" ? set : "system";
}

const COLORS = { light: "#f4f6f5", dark: "#0a100f" };

function apply(choice: Choice) {
  const root = document.documentElement;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (choice === "system") {
    delete root.dataset.theme;
    // Kembalikan warna status bar mengikuti tema sistem.
    metas.forEach((m, i) => {
      m.media = i === 0 ? "(prefers-color-scheme: light)" : "(prefers-color-scheme: dark)";
      m.content = i === 0 ? COLORS.light : COLORS.dark;
    });
  } else {
    root.dataset.theme = choice;
    metas.forEach((m) => { m.removeAttribute("media"); m.content = COLORS[choice]; });
  }
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {}
}

/** Pilihan tampilan: ikuti pengaturan HP, selalu terang, atau selalu gelap. */
export function ThemeSetting() {
  const choice = useSyncExternalStore(subscribe, current, () => "system" as Choice);
  return (
    <Segmented<Choice>
      label="Tampilan" value={choice} onSelect={apply}
      items={[
        { key: "system", label: "Ikuti HP" },
        { key: "light", label: "Terang" },
        { key: "dark", label: "Gelap" },
      ]}
    />
  );
}
