import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ["localhost", "127.0.0.1", "192.168.1.4"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
