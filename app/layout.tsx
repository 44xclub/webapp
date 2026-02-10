import type { Metadata, Viewport } from 'next'
import { PWARegister } from '@/components/PWARegister'
import { ToastProvider } from '@/components/shared/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: '44CLUB Blocks',
  description: 'Track your workouts, habits, nutrition, and more',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '44CLUB',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050508',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ToastProvider>
          <PWARegister />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
