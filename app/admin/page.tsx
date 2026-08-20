'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [name,setName]=useState('Administrador')

  useEffect(()=>{(async()=>{
    if(!supabase){setAllowed(false);return}
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setAllowed(false);return}
    const {data:profile}=await supabase.from('profiles').select('role,full_name').eq('id',user.id).single()
    const ok=profile?.role==='admin'||profile?.role==='manager'
    setAllowed(ok)
    if(profile?.full_name)setName(profile.full_name)
  })()},[])

  async function logout(){if(supabase)await supabase.auth.signOut();window.location.href='/login'}

  if(allowed===null)return <main className="container"><div className="card"><p>Verificando acesso...</p></div></main>
  if(!allowed)return <main className="container"><section className="hero"><h1>Painel administrativo</h1><p>Área restrita do AGENDA-GO.</p></section><div className="card"><p>Você precisa entrar com uma conta de administrador ou gerente.</p><a className="btn" href="/login">Ir para o login</a></div></main>

  return <main className="container"><section className="hero"><h1>Painel administrativo</h1><p>Bem-vindo, {name}. Gerencie a operação do AGENDA-GO por aqui.</p></section><section className="grid"><a className="card" href="/admin/reservas" style={{textDecoration:'none',color:'inherit'}}><h3>Reservas</h3><div className="value">Gerenciar</div><p>Confirmar, iniciar, finalizar ou cancelar locações.</p></a><a className="card" href="/admin/veiculos" style={{textDecoration:'none',color:'inherit'}}><h3>Veículos</h3><div className="value">Gerenciar</div><p>Cadastrar e acompanhar a frota.</p></a></section><section className="section card"><div className="actions"><a className="btn secondary" href="/admin/reservas">Abrir reservas</a><a className="btn secondary" href="/admin/veiculos">Abrir veículos</a><button className="btn" onClick={logout}>Sair do administrador</button></div></section></main>
}