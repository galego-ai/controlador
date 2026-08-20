'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Vehicle={id:string;name:string;brand:string|null;model:string|null;year:number|null;plate:string|null;daily_rate:number;status:string}

export default function AdminVeiculosPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [form,setForm]=useState({name:'',brand:'',model:'',year:'',plate:'',daily_rate:'',status:'available'})
  const [message,setMessage]=useState('')

  async function load(){
    if(!supabase){setAllowed(false);return}
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setAllowed(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    const ok=profile?.role==='admin'||profile?.role==='manager'; setAllowed(ok)
    if(ok){const {data}=await supabase.from('vehicles').select('id,name,brand,model,year,plate,daily_rate,status').order('created_at',{ascending:false});setVehicles((data||[]) as Vehicle[])}
  }
  useEffect(()=>{load()},[])

  async function submit(e:FormEvent){
    e.preventDefault();setMessage('')
    if(!supabase||!allowed)return
    const {error}=await supabase.from('vehicles').insert({name:form.name,brand:form.brand||null,model:form.model||null,year:form.year?Number(form.year):null,plate:form.plate||null,daily_rate:Number(form.daily_rate),status:form.status})
    if(error){setMessage(error.message);return}
    setMessage('Veículo cadastrado com sucesso.');setForm({name:'',brand:'',model:'',year:'',plate:'',daily_rate:'',status:'available'});await load()
  }

  if(allowed===null)return <main className="container"><div className="card"><p>Verificando acesso...</p></div></main>
  if(!allowed)return <main className="container"><section className="hero"><h1>Acesso administrativo</h1><p>Área restrita do AGENDA-GO.</p></section><div className="card"><p>Você precisa estar autenticado como administrador ou gerente.</p><a className="btn" href="/login">Entrar</a></div></main>

  return <main className="container"><section className="hero"><h1>Administrar veículos</h1><p>Cadastre e acompanhe a frota disponível para locação.</p></section><form className="card form" onSubmit={submit}><label>Nome do veículo<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Fiat Mobi 1.0" required /></label><label>Marca<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label><label>Modelo<input value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></label><label>Ano<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>Placa<input value={form.plate} onChange={e=>setForm({...form,plate:e.target.value.toUpperCase()})}/></label><label>Valor da diária<input type="number" min="0" step="0.01" value={form.daily_rate} onChange={e=>setForm({...form,daily_rate:e.target.value})} required /></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="maintenance">Manutenção</option><option value="inactive">Inativo</option></select></label><button className="btn" type="submit">Cadastrar veículo</button>{message&&<p className="message">{message}</p>}</form><section className="section card"><h2>Frota cadastrada</h2>{vehicles.length===0?<p>Nenhum veículo cadastrado.</p>:vehicles.map(v=><div className="rowItem" key={v.id}><strong>{v.name}</strong><span>{v.brand||''} {v.model||''} {v.year||''}</span><span>{v.plate||'Sem placa'} • R$ {Number(v.daily_rate).toFixed(2)}/dia • {v.status}</span></div>)}</section></main>
}