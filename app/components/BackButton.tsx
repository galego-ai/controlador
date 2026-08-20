'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton(){
  const router=useRouter()
  const pathname=usePathname()

  const hiddenRoutes=['/','/login','/reservas','/admin','/super-admin']
  if(hiddenRoutes.includes(pathname)) return null

  function goBack(){
    // Nunca usamos o histórico do navegador nas áreas autenticadas.
    // Isso evita voltar para uma sessão/painel acessado anteriormente.
    if(pathname.startsWith('/super-admin/')){
      router.replace('/super-admin')
      return
    }
    if(pathname.startsWith('/admin/')){
      router.replace('/admin')
      return
    }
    if(pathname.startsWith('/l/')){
      const parts=pathname.split('/').filter(Boolean)
      if(parts.length>=2){router.replace(`/l/${parts[1]}`);return}
    }
    router.replace('/')
  }

  return <button type="button" className="globalBackButton" onClick={goBack} aria-label="Voltar">← Voltar</button>
}
