/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000',
  },
}

export default nextConfig
