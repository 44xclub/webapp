import type { Metadata, Viewport } from 'next'
import { PWARegister } from '@/components/PWARegister'
import { InstallBanner } from '@/components/shared/InstallBanner'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { DebugOverlay } from '@/components/shared/DebugOverlay'
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
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#07090d',
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
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Set --app-height before first paint to prevent layout flash */}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.style.setProperty('--app-height',window.innerHeight+'px')` }} />
      </head>
      <body>
        <ToastProvider>
          <PWARegister />
          <OfflineIndicator />
          <InstallBanner />
          {children}
          <DebugOverlay />
        </ToastProvider>
      </body>
    </html>
  )
}
