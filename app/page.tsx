'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home(){
  const [stats,setStats]=useState({vehicles:0,reservations:0,confirmed:0,revenue:0})
  const [logged,setLogged]=useState(false)

  useEffect(()=>{(async()=>{
    if(!supabase)return
    const {data:{user}}=await supabase.auth.getUser();setLogged(!!user)
    const {count:vehicles}=await supabase.from('vehicles').select('*',{count:'exact',head:true}).neq('status','inactive')
    let reservations=0,confirmed=0,revenue=0
    if(user){
      const {data}=await supabase.from('reservations').select('status,total')
      reservations=data?.length||0
      confirmed=data?.filter(r=>['confirmed','active','completed'].includes(r.status)).length||0
      revenue=(data||[]).filter(r=>r.status==='completed').reduce((sum,r)=>sum+Number(r.total||0),0)
    }
    setStats({vehicles:vehicles||0,reservations,confirmed,revenue})
  })()},[])

  return <main className="container"><section className="hero"><h1>AGENDA-GO</h1><p>Locação de veículos com reservas, disponibilidade e gestão centralizada.</p></section><section className="grid"><div className="card"><h3>Veículos</h3><div className="value">{stats.vehicles}</div><p>Disponíveis no catálogo</p></div><div className="card"><h3>Reservas</h3><div className="value">{stats.reservations}</div><p>{logged?'Reservas acessíveis à sua conta':'Entre para visualizar'}</p></div><div className="card"><h3>Confirmadas</h3><div className="value">{stats.confirmed}</div><p>Confirmadas, ativas ou concluídas</p></div><div className="card"><h3>Concluídas</h3><div className="value">R$ {stats.revenue.toFixed(2)}</div><p>Valor das locações concluídas</p></div></section><section className="section card"><h2>Reservas de veículos</h2><p>Consulte a frota, escolha as datas e faça sua reserva. O sistema impede automaticamente conflitos de horário para o mesmo veículo.</p><div className="actions"><a className="btn" href="/reservas">Fazer reserva</a><a className="btn secondary" href="/veiculos">Ver veículos</a>{!logged&&<a className="btn secondary" href="/login">Entrar</a>}<a className="btn secondary" href="/admin/veiculos">Administração</a></div></section></main>
}