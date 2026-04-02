import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OhMagpie TreasureHunter',
  description: 'Antique jewellery intelligence — @ohmagpie',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
