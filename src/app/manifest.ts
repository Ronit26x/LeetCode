import type { MetadataRoute } from "next";
import { ACCENT_HEX, THEME_HEX } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recur",
    short_name: "Recur",
    description: "Spaced repetition for LeetCode problems.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_HEX.light,
    theme_color: ACCENT_HEX,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
