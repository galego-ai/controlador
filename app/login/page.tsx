'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage(){
  const search=useSearchParams()
  const nextParam=search.get('next')||''
  const locadora=search.get('locadora')||''
  const safeNext=useMemo(()=>nextParam.startsWith('/')&&!nextParam.startsWith('//')?nextParam:'',[nextParam])
  const [mode,setMode]=useState<'login'|'signup'|'forgot'>('login')
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage('')
    if(!supabase){setMessage('Supabase ainda não foi configurado no ambiente.');return}
    setLoading(true)

    if(mode==='forgot'){
      const redirectTo=`${window.location.origin}/redefinir-senha`
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo})
      setMessage(error?error.message:'Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.')
      setLoading(false)
      return
    }

    if(mode==='signup'){
      const emailRedirectTo=`${window.location.origin}/login?email_confirmado=1`
      const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo}})
      setMessage(error?error.message:'Cadastro realizado. Confirme seu e-mail para voltar ao AGENDA-GO e entrar na sua conta.')
      setLoading(false)
      return
    }

    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setMessage(error.message);setLoading(false);return}
    const {data:profile}=await supabase.from('profiles').select('role,is_super_admin').eq('id',data.user.id).single()
    if(profile?.is_super_admin){window.location.href='/super-admin';return}
    const role=profile?.role||'customer'
    if((role==='admin'||role==='manager')&&safeNext==='/admin'){
      window.location.href='/admin'
      return
    }
    window.location.href=role==='admin'||role==='manager'?'/admin':'/reservas'
  }

  const title=mode==='login'?(locadora?'Entrar no painel da locadora':'Entrar'):mode==='signup'?'Criar conta':'Recuperar senha'
  return <main className="container"><section className="hero"><h1>{title}</h1><p>{mode==='forgot'?'Informe o e-mail usado no cadastro. O usuário do AGENDA-GO é o seu próprio e-mail.':mode==='login'?(locadora?`Acesso administrativo da locadora ${locadora.replace(/-/g,' ')}.`:'Entre com sua conta. Super Admin vai para o painel central, administradores para o painel da locadora e clientes para as reservas.'):'Crie sua conta de cliente no AGENDA-GO.'}</p></section><form className="card form" onSubmit={submit}>{mode==='signup'&&<label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} required /></label>}<label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>{mode!=='forgot'&&<label>Senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required /></label>}<button className="btn" type="submit" disabled={loading}>{loading?'Aguarde...':mode==='login'?'Entrar':mode==='signup'?'Cadastrar':'Enviar link de recuperação'}</button>{message&&<p className="message">{message}</p>}{mode==='login'&&<button className="linkButton" type="button" onClick={()=>{setMode('forgot');setMessage('')}}>Esqueci minha senha</button>}<button className="linkButton" type="button" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('')}}>{mode==='signup'?'Já tenho conta':mode==='forgot'?'Criar nova conta':'Ainda não tenho conta'}</button>{mode==='forgot'&&<button className="linkButton" type="button" onClick={()=>{setMode('login');setMessage('')}}>Voltar para entrar</button>}</form></main>
}
