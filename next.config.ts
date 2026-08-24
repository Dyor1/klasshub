import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root. Without this, Turbopack walks up and picks up a
    // stray package-lock.json in the user's home directory.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
