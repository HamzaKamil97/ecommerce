import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vendor Portal',
  description: 'Manage your shop',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
          background: '#0B0B0F',
          color: '#F7F7F8',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
