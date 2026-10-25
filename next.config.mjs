/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async headers() {
    // El navegador debe revisar siempre el Service Worker para recibir actualizaciones.
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }]
  },
}
export default nextConfig
