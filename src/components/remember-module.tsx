"use client";

import { useEffect } from "react";
import { LAST_MODULE_COOKIE, type ModuleKey } from "@/lib/last-module";

/** Mencatat modul yang sedang dibuka di cookie; layar Menu memakainya untuk langsung masuk ke sana. */
export function RememberModule({ module }: { module: ModuleKey }) {
  useEffect(() => {
    document.cookie = `${LAST_MODULE_COOKIE}=${module}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [module]);
  return null;
}
