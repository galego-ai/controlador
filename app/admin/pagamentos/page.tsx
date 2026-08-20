'use client'

import { FormEvent,useEffect,useState } from 'react'
import { supabase } from '../../../lib/supabase'

type PaymentSettings={pix_enabled:boolean;card_enabled:boolean;card_fee_percent:number}

export default function AdminPagamentosPage(){
 const [allowed,setAllowed]=useState<boolean|null>(null)
 const [settings,setSettings]=useState<PaymentSettings>({pix_enabled:true,card_enabled:true,card_fee_percent:4.9})
 const [message,setMessage]=useState('')
 const [saving,setSaving]=useState(false)
 useEffect(()=>{(async()=>{if(!supabase){setAllowed(false);return}const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}const {data:p}=await supabase.from('profiles').select('role').eq('id',user.id).single();const ok=p?.role==='admin'||p?.role==='manager';setAllowed(ok);if(!ok)return;const {data:s}=await supabase.from('settings').select('value').eq('key','payments').maybeSingle();if(s?.value)setSettings(s.value as unknown as PaymentSettings)})()},[])
 async function save(e:FormEvent){e.preventDefault();if(!supabase||!allowed)return;if(!settings.pix_enabled&&!settings.card_enabled){setMessage('Mantenha pelo menos uma forma de pagamento ativa.');return}setSaving(true);setMessage('');const {error}=await supabase.from('settings').update({value:settings,updated_at:new Date().toISOString()}).eq('key','payments');setSaving(false);setMessage(error?error.message:'Configurações de pagamento salvas com sucesso.')}
 if(allowed===null)return <main className="container"><div className="card">Carregando...</div></main>
 if(!allowed)return <main className="container"><div className="card">Acesso restrito ao administrador.</div></main>
 return <main className="container"><section className="hero"><h1>Formas de pagamento</h1><p>Defina quais opções aparecem para os clientes e o acréscimo do cartão.</p></section><form className="card form" onSubmit={save}><label style={{display:'flex',gridTemplateColumns:'auto 1fr',alignItems:'center'}}><input style={{width:'auto'}} type="checkbox" checked={settings.pix_enabled} onChange={e=>setSettings({...settings,pix_enabled:e.target.checked})}/> Aceitar PIX</label><label style={{display:'flex',gridTemplateColumns:'auto 1fr',alignItems:'center'}}><input style={{width:'auto'}} type="checkbox" checked={settings.card_enabled} onChange={e=>setSettings({...settings,card_enabled:e.target.checked})}/> Aceitar cartão</label><label>Acréscimo do cartão (%)<input type="number" min="0" max="30" step="0.1" value={settings.card_fee_percent} onChange={e=>setSettings({...settings,card_fee_percent:Number(e.target.value)})} disabled={!settings.card_enabled}/></label><div className="summary"><span>PIX: <strong>{settings.pix_enabled?'Ativo':'Desativado'}</strong></span><span>Cartão: <strong>{settings.card_enabled?'Ativo':'Desativado'}</strong></span><span>Taxa cartão: <strong>{Number(settings.card_fee_percent).toFixed(1)}%</strong></span></div><button className="btn" type="submit" disabled={saving}>{saving?'Salvando...':'Salvar configurações'}</button>{message&&<p className="message">{message}</p>}</form><div className="actions section"><a className="btn secondary" href="/admin">Painel administrativo</a></div></main>
}