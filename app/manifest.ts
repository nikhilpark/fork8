import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fork8 - Nutrition Tracker",
    short_name: "Fork8",
    description: 'Understand your nutrition without changing the way you eat.',

    start_url: "/",
    scope: "/",
    display: "standalone",

    background_color: "#fbfdfb",
    theme_color: "#19352a",

    orientation: "portrait",

    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}