import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Varsity Production Tracker',
  description: 'Content production tracker for Varsity / LearnApp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-100 text-zinc-900 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
