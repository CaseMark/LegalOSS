/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // PGlite WASM compatibility - treat as external package
  serverExternalPackages: ["@electric-sql/pglite"],
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
