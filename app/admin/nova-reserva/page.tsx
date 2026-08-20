'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Profile={id:string;full_name:string|null}
type Vehicle={id:string;name:string;daily_rate:number;status:string}

export default function AdminNovaReservaPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [clients,setClients]=useState<Profile[]>([])
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [customerId,setCustomerId]=useState('')
  const [vehicleId,setVehicleId]=useState('')
  const [pickupAt,setPickupAt]=useState('')
  const [returnAt,setReturnAt]=useState('')
  const [status,setStatus]=useState('confirmed')
  const [notes,setNotes]=useState('')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{(async()=>{
    if(!supabase){setAllowed(false);return}
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setAllowed(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    const ok=profile?.role==='admin'||profile?.role==='manager'
    setAllowed(ok)
    if(!ok)return
    const [{data:clientData},{data:vehicleData}]=await Promise.all([
      supabase.from('profiles').select('id,full_name').eq('role','customer').order('full_name'),
      supabase.from('vehicles').select('id,name,daily_rate,status').neq('status','inactive').order('name')
    ])
    setClients((clientData||[]) as Profile[])
    setVehicles((vehicleData||[]) as Vehicle[])
  })()},[])

  const selectedVehicle=useMemo(()=>vehicles.find(v=>v.id===vehicleId),[vehicles,vehicleId])
  const days=useMemo(()=>{
    if(!pickupAt||!returnAt)return 0
    const diff=new Date(returnAt).getTime()-new Date(pickupAt).getTime()
    return diff>0?Math.max(1,Math.ceil(diff/86400000)):0
  },[pickupAt,returnAt])
  const total=days*Number(selectedVehicle?.daily_rate||0)

  async function submit(e:FormEvent){
    e.preventDefault();setMessage('')
    if(!supabase||!allowed)return
    if(!customerId||!vehicleId||!pickupAt||!returnAt){setMessage('Preencha todos os campos obrigatórios.');return}
    if(days<1){setMessage('A devolução precisa ser posterior à retirada.');return}
    setSaving(true)
    const {error}=await supabase.from('reservations').insert({
      customer_id:customerId,
      vehicle_id:vehicleId,
      pickup_at:new Date(pickupAt).toISOString(),
      return_at:new Date(returnAt).toISOString(),
      daily_rate:Number(selectedVehicle?.daily_rate||0),
      days,
      subtotal:total,
      total,
      status,
      notes:notes||null
    })
    setSaving(false)
    if(error){
      setMessage(error.message.includes('reservations_no_overlap')?'Este veículo já possui uma reserva nesse período.':error.message)
      return
    }
    setMessage('Reserva criada com sucesso.')
    setCustomerId('');setVehicleId('');setPickupAt('');setReturnAt('');setNotes('');setStatus('confirmed')
  }

  if(allowed===null)return <main className="container"><div className="card"><p>Verificando acesso...</p></div></main>
  if(!allowed)return <main className="container"><section className="hero"><h1>Nova reserva</h1><p>Área restrita.</p></section><div className="card"><p>Você precisa entrar como administrador ou gerente.</p><a className="btn" href="/login">Ir para o login</a></div></main>

  return <main className="container"><section className="hero"><h1>Nova reserva</h1><p>Crie uma reserva para um cliente diretamente pelo painel administrativo.</p></section><form className="card form" onSubmit={submit}><label>Cliente<select value={customerId} onChange={e=>setCustomerId(e.target.value)} required><option value="">Selecione o cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.full_name||'Cliente sem nome'}</option>)}</select></label><label>Veículo<select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required><option value="">Selecione o veículo</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name} — R$ {Number(v.daily_rate).toFixed(2)}/dia</option>)}</select></label><label>Retirada<input type="datetime-local" value={pickupAt} onChange={e=>setPickupAt(e.target.value)} required /></label><label>Devolução<input type="datetime-local" value={returnAt} onChange={e=>setReturnAt(e.target.value)} required /></label><label>Status inicial<select value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">Pendente</option><option value="confirmed">Confirmada</option><option value="active">Ativa</option></select></label><label>Observações<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional" /></label><div className="summary"><span><strong>{days}</strong> diária(s)</span><span><strong>R$ {total.toFixed(2)}</strong></span></div><button className="btn" type="submit" disabled={saving}>{saving?'Salvando...':'Criar reserva'}</button>{message&&<p className="message">{message}</p>}</form><div className="actions section"><a className="btn secondary" href="/admin/reservas">Ver reservas</a><a className="btn secondary" href="/admin">Painel administrativo</a></div></main>
}