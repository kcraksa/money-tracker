import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Semua halaman bergantung pada sesi pengguna, jadi dirender dinamis (tanpa Cache Components).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
