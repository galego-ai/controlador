'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton(){
  const router=useRouter()
  const pathname=usePathname()

  const hiddenRoutes=['/','/login','/reservas','/admin']
  if(hiddenRoutes.includes(pathname)) return null

  function goBack(){
    if(pathname.startsWith('/admin')){
      router.push('/admin')
      return
    }
    if(window.history.length>1){
      router.back()
      return
    }
    router.push('/')
  }

  return <button type="button" className="globalBackButton" onClick={goBack} aria-label="Voltar">← Voltar</button>
}
