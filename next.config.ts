import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost:3000', '127.0.0.1:3000', '*.loca.lt', 'loca.lt', '10.24.114.24:3000', '*.pinggy-free.link', '*.pinggy.link', '*.trycloudflare.com'],
};

export default nextConfig;
