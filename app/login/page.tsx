'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage(){
  const [mode,setMode]=useState<'login'|'signup'>('login')
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage('')
    if(!supabase){setMessage('Supabase ainda não foi configurado no ambiente.');return}
    setLoading(true)

    if(mode==='signup'){
      const emailRedirectTo=`${window.location.origin}/login?email_confirmado=1`
      const {error}=await supabase.auth.signUp({
        email,
        password,
        options:{data:{full_name:name},emailRedirectTo}
      })
      setMessage(error?error.message:'Cadastro realizado. Confirme seu e-mail para voltar ao AGENDA-GO e entrar na sua conta.')
      setLoading(false)
      return
    }

    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setMessage(error.message);setLoading(false);return}

    const user=data.user
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    const role=profile?.role||'customer'
    window.location.href=role==='admin'||role==='manager'?'/admin':'/reservas'
  }

  return <main className="container"><section className="hero"><h1>{mode==='login'?'Entrar':'Criar conta'}</h1><p>{mode==='login'?'Entre com sua conta. Administradores são direcionados ao painel administrativo e clientes às reservas.':'Crie sua conta de cliente no AGENDA-GO.'}</p></section><form className="card form" onSubmit={submit}>{mode==='signup'&&<label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} required /></label>}<label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="btn" type="submit" disabled={loading}>{loading?'Aguarde...':mode==='login'?'Entrar':'Cadastrar'}</button>{message&&<p>{message}</p>}<button className="linkButton" type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Ainda não tenho conta':'Já tenho conta'}</button></form></main>
}