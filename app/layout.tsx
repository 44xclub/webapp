import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { PWARegister } from '@/components/PWARegister'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#121212',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
