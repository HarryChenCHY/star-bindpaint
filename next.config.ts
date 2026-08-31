import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["stroke-sequence-planner"],
  output: "standalone",
};

export default nextConfig;
