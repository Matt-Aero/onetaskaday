import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "One - One Task a Day",
    short_name: "One",
    description: "One clear action at a time, chosen around the life you want.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f2",
    theme_color: "#f7f7f2",
  };
}
