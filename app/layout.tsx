import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AGENDA-GO',
  description: 'Sistema de reservas e gestão de veículos',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}