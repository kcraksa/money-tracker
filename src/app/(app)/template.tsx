import { ViewTransition } from "react";

// Template dibuat ulang tiap navigasi, jadi isi halaman bertransisi sementara bottom nav
// (di layout) tetap diam. Link bertanda forward/back menggeser; lainnya naik halus.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-out" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
