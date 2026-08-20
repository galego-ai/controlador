'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle={id:string;name:string;brand:string|null;model:string|null;year:number|null;daily_rate:number;status:string;image_url:string|null;category:string|null}
const statusLabel:Record<string,string>={available:'Livre',reserved:'Reservado',maintenance:'Manutenção',inactive:'Indisponível'}

export default function VeiculosPage(){
 const [vehicles,setVehicles]=useState<Vehicle[]>([]),[loading,setLoading]=useState(true),[category,setCategory]=useState('Todas')
 useEffect(()=>{(async()=>{if(!supabase){setLoading(false);return}const {data}=await supabase.from('vehicles').select('id,name,brand,model,year,daily_rate,status,image_url,category').neq('status','inactive').order('category').order('name');setVehicles((data||[]) as Vehicle[]);setLoading(false)})()},[])
 const categories=useMemo(()=>['Todas',...Array.from(new Set(vehicles.map(v=>v.category||'Econômico')))], [vehicles])
 const visible=useMemo(()=>category==='Todas'?vehicles:vehicles.filter(v=>(v.category||'Econômico')===category),[vehicles,category])
 function book(v:Vehicle){if(v.status!=='available')return;window.location.href=`/reservas?veiculo=${encodeURIComponent(v.id)}#form-reserva`}
 return <main className="container"><section className="hero"><h1>Catálogo de veículos</h1><p>Veja fotos, categorias e valores. Clique na foto de um veículo livre para preencher a reserva.</p></section><div className="categoryTabs">{categories.map(c=><button key={c} className={`categoryTab ${category===c?'active':''}`} type="button" onClick={()=>setCategory(c)}>{c}</button>)}</div>{loading?<div className="card"><p>Carregando veículos...</p></div>:visible.length===0?<div className="card"><h2>Nenhum veículo disponível</h2><p>Não encontramos veículos nesta categoria.</p></div>:<div className="vehicleCatalog">{visible.map(v=><article className={`vehicleCard ${v.status!=='available'?'vehicleUnavailable':''}`} key={v.id} onClick={()=>book(v)} role={v.status==='available'?'button':undefined} tabIndex={v.status==='available'?0:-1} onKeyDown={e=>{if(v.status==='available'&&(e.key==='Enter'||e.key===' '))book(v)}}><div className="vehiclePhotoArea">{v.image_url?<img src={v.image_url} alt={v.name}/>:<div className="vehicleNoPhoto">Sem foto</div>}<span className={v.status==='available'?'availabilityBadge':'statusBadge'}>{statusLabel[v.status]||v.status}</span></div><div className="vehicleCardBody"><span className="vehicleCategory">{v.category||'Econômico'}</span><h3>{v.name}</h3><span>{v.brand||''} {v.model||''} {v.year?`• ${v.year}`:''}</span><strong>R$ {Number(v.daily_rate).toFixed(2)}/dia</strong>{v.status==='available'?<span className="vehicleReserveHint">Clique na foto para reservar</span>:<span>Veículo indisponível para nova reserva.</span>}</div></article>)}</div>}</main>
}