'use client'

import { FormEvent,useEffect,useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RedefinirSenhaPage(){
 const [password,setPassword]=useState('')
 const [confirm,setConfirm]=useState('')
 const [ready,setReady]=useState(false)
 const [message,setMessage]=useState('Aguardando validação do link...')
 const [loading,setLoading]=useState(false)

 useEffect(()=>{
   if(!supabase){setMessage('Supabase ainda não foi configurado.');return}
   const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
     if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN'){setReady(true);setMessage('Link validado. Crie sua nova senha.')}
   })
   supabase.auth.getSession().then(({data})=>{if(data.session){setReady(true);setMessage('Link validado. Crie sua nova senha.')}})
   return()=>subscription.unsubscribe()
 },[])

 async function submit(e:FormEvent){
   e.preventDefault();setMessage('')
   if(!supabase||!ready)return
   if(password.length<6){setMessage('A nova senha deve ter pelo menos 6 caracteres.');return}
   if(password!==confirm){setMessage('As senhas não coincidem.');return}
   setLoading(true)
   const {error}=await supabase.auth.updateUser({password})
   setLoading(false)
   if(error){setMessage(error.message);return}
   await supabase.auth.signOut()
   setMessage('Senha alterada com sucesso. Redirecionando para o login...')
   setTimeout(()=>{window.location.href='/login'},1200)
 }

 return <main className="container"><section className="hero"><h1>Redefinir senha</h1><p>Crie uma nova senha para sua conta AGENDA-GO.</p></section><form className="card form" onSubmit={submit}><label>Nova senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required disabled={!ready}/></label><label>Confirmar nova senha<input type="password" minLength={6} value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={!ready}/></label><button className="btn" type="submit" disabled={!ready||loading}>{loading?'Salvando...':'Alterar senha'}</button>{message&&<p className="message">{message}</p>}<a className="btn secondary" href="/login">Voltar ao login</a></form></main>
}