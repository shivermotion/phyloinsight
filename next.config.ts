import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Enable async WebAssembly (required for Pyodide and some ONNX backends)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.experiments as any) = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    };

    // Avoid bundling Node core modules in the client
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },
};

export default nextConfig;
