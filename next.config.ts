import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri — generates a fully static `out/` directory
  output: "export",
  // Tauri serves from the filesystem, so relative paths are needed
  trailingSlash: true,
  // Images must be unoptimized in static export mode
  images: { unoptimized: true },
};

export default nextConfig;
