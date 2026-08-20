'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Reservation={id:string;pickup_at:string;return_at:string;days:number;total:number;status:string;vehicles:{name:string}|null;profiles:{full_name:string|null}|null}
const statuses=['pending','confirmed','active','completed','cancelled']

export default function AdminReservasPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [items,setItems]=useState<Reservation[]>([])
  const [message,setMessage]=useState('')

  async function load(){
    if(!supabase){setAllowed(false);return}
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    const ok=profile?.role==='admin'||profile?.role==='manager';setAllowed(ok)
    if(ok){const {data}=await supabase.from('reservations').select('id,pickup_at,return_at,days,total,status,vehicles(name),profiles(full_name)').order('pickup_at',{ascending:true});setItems((data||[]) as unknown as Reservation[])}
  }
  useEffect(()=>{load()},[])

  async function changeStatus(id:string,status:string){
    if(!supabase)return
    const {error}=await supabase.from('reservations').update({status}).eq('id',id)
    setMessage(error?error.message:'Status atualizado.');if(!error)await load()
  }

  if(allowed===null)return <main className="container"><div className="card"><p>Verificando acesso...</p></div></main>
  if(!allowed)return <main className="container"><section className="hero"><h1>Reservas administrativas</h1><p>Área restrita.</p></section><div className="card"><p>Acesso permitido somente para administrador ou gerente.</p><a className="btn" href="/login">Entrar</a></div></main>

  return <main className="container"><section className="hero"><h1>Gerenciar reservas</h1><p>Confirme, inicie, finalize ou cancele locações.</p></section>{message&&<p className="message">{message}</p>}<section className="card">{items.length===0?<p>Nenhuma reserva cadastrada.</p>:items.map(r=><div className="rowItem" key={r.id}><strong>{r.vehicles?.name||'Veículo'} — {r.profiles?.full_name||'Cliente'}</strong><span>{new Date(r.pickup_at).toLocaleString('pt-BR')} → {new Date(r.return_at).toLocaleString('pt-BR')}</span><span>{r.days} diária(s) • R$ {Number(r.total).toFixed(2)}</span><label>Status<select value={r.status} onChange={e=>changeStatus(r.id,e.target.value)}>{statuses.map(s=><option value={s} key={s}>{s}</option>)}</select></label></div>)}</section><div className="actions section"><a className="btn secondary" href="/admin/veiculos">Veículos</a><a className="btn secondary" href="/">Painel</a></div></main>
}