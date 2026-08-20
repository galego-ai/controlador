'use client'

import {useEffect} from 'react'

export default function ReservasLayout({children}:{children:React.ReactNode}){
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  const vehicleId=params.get('veiculo')
  if(!vehicleId)return
  let attempts=0
  const timer=window.setInterval(()=>{
   attempts++
   const form=document.getElementById('form-reserva')
   const select=form?.querySelector('select') as HTMLSelectElement|null
   if(select&&Array.from(select.options).some(o=>o.value===vehicleId)){
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')?.set
    setter?.call(select,vehicleId)
    select.dispatchEvent(new Event('change',{bubbles:true}))
    window.clearInterval(timer)
    setTimeout(()=>form?.scrollIntoView({behavior:'smooth',block:'start'}),80)
   }else if(attempts>30)window.clearInterval(timer)
  },100)
  return()=>window.clearInterval(timer)
 },[])
 return children
}
