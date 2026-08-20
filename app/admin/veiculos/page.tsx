'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Vehicle={id:string;name:string;brand:string|null;model:string|null;year:number|null;plate:string|null;daily_rate:number;status:string}
const emptyForm={name:'',brand:'',model:'',year:'',plate:'',daily_rate:'',status:'available'}
const statusLabel:Record<string,string>={available:'Disponível',reserved:'Reservado',maintenance:'Manutenção',inactive:'Pausado'}

export default function AdminVeiculosPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [form,setForm]=useState(emptyForm)
  const [editingId,setEditingId]=useState<string|null>(null)
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
    const payload={name:form.name,brand:form.brand||null,model:form.model||null,year:form.year?Number(form.year):null,plate:form.plate||null,daily_rate:Number(form.daily_rate),status:form.status}
    const result=editingId?await supabase.from('vehicles').update(payload).eq('id',editingId):await supabase.from('vehicles').insert(payload)
    if(result.error){setMessage(result.error.message);return}
    setMessage(editingId?'Veículo atualizado com sucesso.':'Veículo cadastrado com sucesso.')
    setEditingId(null);setForm(emptyForm);await load()
  }

  function editVehicle(v:Vehicle){
    setEditingId(v.id)
    setForm({name:v.name,brand:v.brand||'',model:v.model||'',year:v.year?String(v.year):'',plate:v.plate||'',daily_rate:String(v.daily_rate),status:v.status})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  async function changeStatus(v:Vehicle,status:'available'|'maintenance'|'inactive'){
    if(!supabase)return
    setMessage('')
    let finalStatus=status
    if(status==='available'){
      const {data}=await supabase.from('reservations').select('id').eq('vehicle_id',v.id).in('status',['pending','confirmed','active']).limit(1)
      if(data?.length) finalStatus='reserved' as 'available'
    }
    const {error}=await supabase.from('vehicles').update({status:finalStatus,updated_at:new Date().toISOString()}).eq('id',v.id)
    setMessage(error?error.message:finalStatus==='reserved'?'O veículo possui reserva ativa e continua como Reservado.':`Status alterado para ${statusLabel[finalStatus]}.`)
    if(!error)await load()
  }

  async function deleteVehicle(v:Vehicle){
    if(!supabase)return
    if(!window.confirm(`Excluir definitivamente ${v.name}?`))return
    const {error}=await supabase.from('vehicles').delete().eq('id',v.id)
    if(error){setMessage('Não foi possível excluir. Se o veículo já possui reservas, mantenha-o como Pausado/Inativo para preservar o histórico.');return}
    setMessage('Veículo excluído com sucesso.');await load()
  }

  if(allowed===null)return <main className="container"><div className="card"><p>Verificando acesso...</p></div></main>
  if(!allowed)return <main className="container"><section className="hero"><h1>Acesso administrativo</h1><p>Área restrita do AGENDA-GO.</p></section><div className="card"><p>Você precisa estar autenticado como administrador ou gerente.</p><a className="btn" href="/login">Entrar</a></div></main>

  return <main className="container"><section className="hero"><h1>Administrar veículos</h1><p>Cadastre, edite e controle disponibilidade, reservas e manutenção da frota.</p></section>
  <form className="card form" onSubmit={submit}><h2>{editingId?'Editar veículo':'Cadastrar veículo'}</h2><label>Nome do veículo<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Fiat Mobi 1.0" required /></label><label>Marca<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label><label>Modelo<input value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></label><label>Ano<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>Placa<input value={form.plate} onChange={e=>setForm({...form,plate:e.target.value.toUpperCase()})}/></label><label>Valor da diária<input type="number" min="0" step="0.01" value={form.daily_rate} onChange={e=>setForm({...form,daily_rate:e.target.value})} required /></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="maintenance">Manutenção</option><option value="inactive">Pausado</option></select></label><div className="actions"><button className="btn" type="submit">{editingId?'Salvar alterações':'Cadastrar veículo'}</button>{editingId&&<button className="btn secondary" type="button" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>Cancelar edição</button>}</div>{message&&<p className="message">{message}</p>}</form>
  <section className="section card"><h2>Frota cadastrada</h2>{vehicles.length===0?<p>Nenhum veículo cadastrado.</p>:vehicles.map(v=><div className="rowItem" key={v.id}><strong>{v.name}</strong><span>{v.brand||''} {v.model||''} {v.year||''}</span><span>{v.plate||'Sem placa'} • R$ {Number(v.daily_rate).toFixed(2)}/dia • <strong>{statusLabel[v.status]||v.status}</strong></span><div className="actions"><button className="btn secondary" onClick={()=>editVehicle(v)}>Editar</button>{v.status!=='inactive'&&<button className="btn secondary" onClick={()=>changeStatus(v,'inactive')}>Pausar</button>}{v.status!=='maintenance'&&<button className="btn secondary" onClick={()=>changeStatus(v,'maintenance')}>Manutenção</button>}{(v.status==='inactive'||v.status==='maintenance')&&<button className="btn secondary" onClick={()=>changeStatus(v,'available')}>Reativar</button>}<button className="btn" onClick={()=>deleteVehicle(v)}>Excluir</button></div></div>)}</section></main>
}