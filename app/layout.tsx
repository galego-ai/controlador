import type { Metadata } from 'next'
import './globals.css'
import BackButton from './components/BackButton'

export const metadata: Metadata = {
  title: 'AGENDA-GO',
  description: 'Sistema de reservas e gestão de veículos',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><BackButton />{children}</body></html>
}