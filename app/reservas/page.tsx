'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle={id:string;name:string;daily_rate:number}
type Reservation={id:string;pickup_at:string;return_at:string;days:number;total:number;status:string;vehicles:{name:string}|null}

const statusLabel:Record<string,string>={pending:'Pendente',confirmed:'Confirmada',active:'Ativa',completed:'Concluída',cancelled:'Cancelada'}

export default function ReservasPage(){
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [reservations,setReservations]=useState<Reservation[]>([])
  const [vehicleId,setVehicleId]=useState('')
  const [pickup,setPickup]=useState('')
  const [returnAt,setReturnAt]=useState('')
  const [message,setMessage]=useState('')
  const [userId,setUserId]=useState<string|null>(null)
  const [cancellingId,setCancellingId]=useState<string|null>(null)

  const selected=useMemo(()=>vehicles.find(v=>v.id===vehicleId),[vehicles,vehicleId])
  const estimatedDays=useMemo(()=>{if(!pickup||!returnAt)return 0;const ms=new Date(returnAt).getTime()-new Date(pickup).getTime();return ms>0?Math.max(1,Math.ceil(ms/86400000)):0},[pickup,returnAt])
  const estimate=selected&&estimatedDays?selected.daily_rate*estimatedDays:0

  async function load(){
    if(!supabase)return
    const {data:{user}}=await supabase.auth.getUser(); setUserId(user?.id||null)
    const {data:v}=await supabase.from('vehicles').select('id,name,daily_rate').eq('status','available').order('name')
    setVehicles((v||[]) as Vehicle[])
    if(user){const {data:r}=await supabase.from('reservations').select('id,pickup_at,return_at,days,total,status,vehicles(name)').order('created_at',{ascending:false});setReservations((r||[]) as unknown as Reservation[])}
  }
  useEffect(()=>{load()},[])

  async function submit(e:FormEvent){
    e.preventDefault();setMessage('')
    if(!supabase||!userId||!selected){setMessage('Entre na sua conta e selecione um veículo.');return}
    const {error}=await supabase.from('reservations').insert({customer_id:userId,vehicle_id:selected.id,pickup_at:new Date(pickup).toISOString(),return_at:new Date(returnAt).toISOString(),daily_rate:selected.daily_rate})
    if(error){setMessage(error.code==='23P01'?'Este veículo já possui reserva nesse período. Escolha outras datas.':error.message);return}
    setMessage('Reserva criada com sucesso.');setPickup('');setReturnAt('');setVehicleId('');await load()
  }

  function canCancel(r:Reservation){
    const allowedStatus=r.status==='pending'||r.status==='confirmed'
    const twoHours=2*60*60*1000
    return allowedStatus&&new Date(r.pickup_at).getTime()-Date.now()>twoHours
  }

  async function cancelReservation(r:Reservation){
    if(!supabase||!canCancel(r))return
    if(!window.confirm('Deseja realmente cancelar esta reserva?'))return
    setCancellingId(r.id);setMessage('')
    const {error}=await supabase.from('reservations').update({status:'cancelled'}).eq('id',r.id)
    setCancellingId(null)
    if(error){setMessage(error.message);return}
    setMessage('Reserva cancelada com sucesso.');await load()
  }

  return <main className="container"><section className="hero"><h1>Reservas</h1><p>Escolha o veículo, informe retirada e devolução e veja o cálculo das diárias.</p></section>{!userId&&<div className="card"><p>Para reservar, entre na sua conta.</p><a className="btn" href="/login">Entrar / Criar conta</a></div>}<form className="card form" onSubmit={submit}><label>Veículo<select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required><option value="">Selecione</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name} — R$ {Number(v.daily_rate).toFixed(2)}/dia</option>)}</select></label><label>Retirada<input type="datetime-local" value={pickup} onChange={e=>setPickup(e.target.value)} required /></label><label>Devolução<input type="datetime-local" value={returnAt} onChange={e=>setReturnAt(e.target.value)} required /></label><div className="summary"><strong>{estimatedDays||0} diária(s)</strong><span>Estimativa: R$ {estimate.toFixed(2)}</span></div><button className="btn" type="submit" disabled={!userId}>Confirmar reserva</button>{message&&<p className="message">{message}</p>}</form><section className="section"><div className="card"><h2>Minhas reservas</h2><p>O cancelamento pelo usuário é permitido somente até 2 horas antes do horário de retirada.</p>{reservations.length===0?<p>Nenhuma reserva cadastrada.</p>:reservations.map(r=><div key={r.id} className="rowItem"><strong>{r.vehicles?.name||'Veículo'}</strong><span>{new Date(r.pickup_at).toLocaleString('pt-BR')} → {new Date(r.return_at).toLocaleString('pt-BR')}</span><span>{r.days} diária(s) • R$ {Number(r.total).toFixed(2)} • {statusLabel[r.status]||r.status}</span>{canCancel(r)?<button className="btn secondary" type="button" disabled={cancellingId===r.id} onClick={()=>cancelReservation(r)}>{cancellingId===r.id?'Cancelando...':'Cancelar reserva'}</button>:r.status!=='cancelled'&&<small>Cancelamento indisponível nesta etapa ou faltam menos de 2 horas para a retirada.</small>}</div>)}</div></section></main>
}