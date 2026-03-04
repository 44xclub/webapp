import type { Metadata, Viewport } from 'next'
import { PWARegister } from '@/components/PWARegister'
import { InstallBanner } from '@/components/shared/InstallBanner'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
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
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Set --app-height before first paint to prevent layout flash on iOS PWA.
            In standalone mode use screen.height for true full-screen coverage. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone;var h=s?screen.height:window.innerHeight;document.documentElement.style.setProperty('--app-height',h+'px')})()` }} />
      </head>
      <body>
        <ToastProvider>
          <PWARegister />
          <OfflineIndicator />
          <InstallBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
