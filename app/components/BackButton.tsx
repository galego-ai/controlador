'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton(){
  const router=useRouter()
  const pathname=usePathname()

  if(pathname==='/') return null

  function goBack(){
    if(window.history.length>1){
      router.back()
      return
    }
    router.push(pathname.startsWith('/admin')?'/admin':'/')
  }

  return <button type="button" className="globalBackButton" onClick={goBack} aria-label="Voltar para a página anterior">← Voltar</button>
}
