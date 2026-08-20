'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle = { id:string; name:string; brand:string|null; model:string|null; year:number|null; plate:string|null; daily_rate:number; status:string }

export default function VeiculosPage(){
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{ if(!supabase){setLoading(false);return}; const {data}=await supabase.from('vehicles').select('id,name,brand,model,year,plate,daily_rate,status').order('created_at',{ascending:false}); setVehicles((data||[]) as Vehicle[]); setLoading(false) })()},[])
  return <main className="container"><div className="hero"><h1>Veículos</h1><p>Frota cadastrada no AGENDA-GO.</p></div><div className="card">{loading?<p>Carregando...</p>:vehicles.length===0?<><h2>Nenhum veículo cadastrado</h2><p>Cadastre o primeiro veículo diretamente pelo painel administrativo.</p></>:<div>{vehicles.map(v=><div key={v.id} style={{padding:'14px 0',borderBottom:'1px solid #eee'}}><strong>{v.name}</strong><br/><span>{v.brand||''} {v.model||''} {v.year?`• ${v.year}`:''}</span><br/><span>Placa: {v.plate||'—'} • R$ {Number(v.daily_rate).toFixed(2)} / diária • {v.status}</span></div>)}</div>}<br/><a className="btn" href="/">Voltar ao painel</a></div></main>
}