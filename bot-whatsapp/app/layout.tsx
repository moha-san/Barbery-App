export const metadata = { title: 'Bot de WhatsApp' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 16, margin: 0, background: '#0b0a10', color: '#eceaf2', minHeight: '100vh' }}>{children}</body>
    </html>
  )
}
