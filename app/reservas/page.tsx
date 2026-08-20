'use client'

import {FormEvent,useEffect,useMemo,useState} from 'react'
import {supabase} from '../../lib/supabase'

type Vehicle={id:string;name:string;daily_rate:number;image_url:string|null;category:string}
type Reservation={id:string;pickup_at:string;return_at:string;days:number;total:number;status:string;customer_phone:string|null;payment_method:string|null;payment_fee:number;payment_total:number|null;payment_status:string|null;pix_qrcode:string|null;pix_link:string|null;card_mask:string|null;vehicles:{name:string;image_url:string|null}|null}
type PaymentSettings={pix_enabled:boolean;card_enabled:boolean;card_fee_percent:number}
type Profile={full_name:string|null;phone:string|null;cpf:string|null}
type PixData={qrcode:string;imagemQrcode:string;linkVisualizacao?:string;txid?:string}

const statusLabel:Record<string,string>={pending:'Pendente',confirmed:'Confirmada',active:'Ativa',completed:'Concluída',cancelled:'Cancelada'}

export default function ReservasPage(){
  const [vehicles,setVehicles]=useState<Vehicle[]>([])
  const [reservations,setReservations]=useState<Reservation[]>([])
  const [vehicleId,setVehicleId]=useState('')
  const [pickup,setPickup]=useState('')
  const [returnAt,setReturnAt]=useState('')
  const [phone,setPhone]=useState('')
  const [message,setMessage]=useState('')
  const [userId,setUserId]=useState<string|null>(null)
  const [userEmail,setUserEmail]=useState('')
  const [profile,setProfile]=useState<Profile>({full_name:null,phone:null,cpf:null})
  const [cancellingId,setCancellingId]=useState<string|null>(null)
  const [category,setCategory]=useState('Todas')
  const [payment,setPayment]=useState<'pix'|'card'>('pix')
  const [paymentSettings,setPaymentSettings]=useState<PaymentSettings>({pix_enabled:true,card_enabled:true,card_fee_percent:4.9})
  const [processing,setProcessing]=useState(false)
  const [pixData,setPixData]=useState<PixData|null>(null)
  const [successText,setSuccessText]=useState('')
  const [payeeCode,setPayeeCode]=useState('')
  const [efiEnvironment,setEfiEnvironment]=useState<'production'|'sandbox'>('production')
  const [cardNumber,setCardNumber]=useState('')
  const [cardCvv,setCardCvv]=useState('')
  const [cardMonth,setCardMonth]=useState('')
  const [cardYear,setCardYear]=useState('')
  const [cardHolder,setCardHolder]=useState('')
  const [cardCpf,setCardCpf]=useState('')

  const selected=useMemo(()=>vehicles.find(v=>v.id===vehicleId),[vehicles,vehicleId])
  const categories=useMemo(()=>['Todas',...Array.from(new Set(vehicles.map(v=>v.category||'Econômico')))],[vehicles])
  const visibleVehicles=useMemo(()=>category==='Todas'?vehicles:vehicles.filter(v=>(v.category||'Econômico')===category),[vehicles,category])
  const estimatedDays=useMemo(()=>{if(!pickup||!returnAt)return 0;const ms=new Date(returnAt).getTime()-new Date(pickup).getTime();return ms>0?Math.max(1,Math.ceil(ms/86400000)):0},[pickup,returnAt])
  const estimate=selected&&estimatedDays?selected.daily_rate*estimatedDays:0
  const fee=payment==='card'?estimate*(Number(paymentSettings.card_fee_percent||0)/100):0
  const paymentTotal=estimate+fee

  async function load(){
    if(!supabase)return
    const {data:{user}}=await supabase.auth.getUser()
    setUserId(user?.id||null);setUserEmail(user?.email||'')
    const {data:s}=await supabase.from('settings').select('value').eq('key','payments').maybeSingle()
    if(s?.value){const cfg=s.value as unknown as PaymentSettings;setPaymentSettings(cfg);if(!cfg.pix_enabled&&cfg.card_enabled)setPayment('card')}
    const {data:v}=await supabase.from('vehicles').select('id,name,daily_rate,image_url,category').eq('status','available').order('category').order('name')
    setVehicles((v||[]) as Vehicle[])
    if(user){
      const {data:p}=await supabase.from('profiles').select('full_name,phone,cpf').eq('id',user.id).single()
      if(p){setProfile(p as Profile);if(p.phone)setPhone(p.phone);if(p.full_name)setCardHolder(p.full_name);if(p.cpf)setCardCpf(p.cpf)}
      const {data:r}=await supabase.from('reservations').select('id,pickup_at,return_at,days,total,status,customer_phone,payment_method,payment_fee,payment_total,payment_status,pix_qrcode,pix_link,card_mask,vehicles(name,image_url)').order('created_at',{ascending:false})
      setReservations((r||[]) as unknown as Reservation[])
    }
    try{const response=await fetch('/api/card/config',{cache:'no-store'});const cfg=await response.json();setPayeeCode(cfg.payeeCode||'');setEfiEnvironment(cfg.environment==='sandbox'?'sandbox':'production')}catch{}
  }

  useEffect(()=>{load()},[])

  function chooseVehicle(v:Vehicle){setVehicleId(v.id);setMessage('');setTimeout(()=>document.getElementById('form-reserva')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}

  async function generateCardToken(){
    if(!payeeCode)throw new Error('Cartão ainda não configurado: falta o Identificador de conta Efí (EFI_PAYEE_CODE).')
    const holderDocument=cardCpf.replace(/\D/g,'')
    if(holderDocument.length!==11)throw new Error('Informe um CPF válido do titular do cartão.')
    const mod:any=await import('payment-token-efi')
    const EfiPay=mod.default||mod
    const brand=await EfiPay.CreditCard.setCardNumber(cardNumber.replace(/\s/g,'')).verifyCardBrand()
    if(!brand||brand==='unsupported'||brand==='undefined')throw new Error('Bandeira do cartão não suportada.')
    const token=await EfiPay.CreditCard.setAccount(payeeCode).setEnvironment(efiEnvironment).setCreditCardData({brand,number:cardNumber.replace(/\D/g,''),cvv:cardCvv.replace(/\D/g,''),expirationMonth:cardMonth.padStart(2,'0'),expirationYear:cardYear,holderName:cardHolder,holderDocument,reuse:false}).getPaymentToken()
    return token as {payment_token:string;card_mask:string}
  }

  async function submit(e:FormEvent){
    e.preventDefault();setMessage('');setSuccessText('');setPixData(null)
    if(!supabase||!userId||!selected){setMessage('Entre na sua conta e selecione um veículo.');return}
    if(phone.replace(/\D/g,'').length<10){setMessage('Informe um número de telefone válido com DDD.');return}
    if(estimatedDays<1){setMessage('A devolução precisa ser posterior à retirada.');return}
    if((payment==='pix'&&!paymentSettings.pix_enabled)||(payment==='card'&&!paymentSettings.card_enabled)){setMessage('Esta forma de pagamento está indisponível.');return}
    setProcessing(true)
    try{
      const cleanPhone=phone.trim()
      await supabase.from('profiles').update({phone:cleanPhone}).eq('id',userId)
      let cardToken:{payment_token:string;card_mask:string}|null=null
      if(payment==='card')cardToken=await generateCardToken()
      const {data:reservation,error}=await supabase.from('reservations').insert({customer_id:userId,vehicle_id:selected.id,pickup_at:new Date(pickup).toISOString(),return_at:new Date(returnAt).toISOString(),daily_rate:selected.daily_rate,customer_phone:cleanPhone,payment_method:payment,payment_fee:Number(fee.toFixed(2)),payment_total:Number(paymentTotal.toFixed(2)),payment_status:'pending'}).select('id').single()
      if(error)throw new Error(error.code==='23P01'?'Este veículo já possui reserva nesse período. Escolha outras datas.':error.message)

      if(payment==='pix'){
        const response=await fetch('/api/pix/criar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(paymentTotal.toFixed(2)),name:profile.full_name||'Cliente AGENDA-GO',cpf:profile.cpf||'',description:`Reserva ${selected.name}`})})
        const result=await response.json()
        if(!response.ok)throw new Error(`Reserva criada, mas o PIX não pôde ser gerado: ${result.error||'erro na Efí'}`)
        await supabase.from('reservations').update({pix_txid:result.txid||null,pix_qrcode:result.qrcode||null,pix_link:result.linkVisualizacao||null}).eq('id',reservation.id)
        setPixData({qrcode:result.qrcode,imagemQrcode:result.imagemQrcode,linkVisualizacao:result.linkVisualizacao,txid:result.txid})
      }else if(cardToken){
        const cpf=(profile.cpf||cardCpf).replace(/\D/g,'')
        const response=await fetch('/api/card/pagar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(paymentTotal.toFixed(2)),paymentToken:cardToken.payment_token,name:profile.full_name||cardHolder,cpf,email:userEmail,phone:cleanPhone,installments:1,description:`Reserva ${selected.name}`})})
        const result=await response.json()
        if(!response.ok)throw new Error(`Reserva criada, mas o cartão não pôde ser processado: ${result.error||'erro na Efí'}`)
        const approved=result.status==='approved'||result.status==='paid'
        await supabase.from('reservations').update({payment_status:approved?'paid':result.status||'pending',card_charge_id:result.chargeId?String(result.chargeId):null,card_mask:cardToken.card_mask||null}).eq('id',reservation.id)
        if(!approved)throw new Error(result.refusal?.reason||'Pagamento no cartão não aprovado. A reserva ficou pendente.')
        setSuccessText(`Pagamento aprovado no cartão ${cardToken.card_mask}. Reserva criada com sucesso!`)
      }
      setPickup('');setReturnAt('');setVehicleId('');setCardNumber('');setCardCvv('');setCardMonth('');setCardYear('')
      if(payment==='pix')setSuccessText('Reserva criada! Pague o PIX abaixo para concluir o pagamento.')
      await load()
    }catch(err:any){setMessage(err?.message||'Não foi possível concluir a reserva.')}
    finally{setProcessing(false)}
  }

  function canCancel(r:Reservation){return (r.status==='pending'||r.status==='confirmed')&&new Date(r.pickup_at).getTime()-Date.now()>7200000}
  async function cancelReservation(r:Reservation){if(!supabase||!canCancel(r)||!window.confirm('Deseja realmente cancelar esta reserva?'))return;setCancellingId(r.id);setMessage('');const {error}=await supabase.from('reservations').update({status:'cancelled'}).eq('id',r.id);setCancellingId(null);if(error){setMessage(error.message);return}setMessage('Reserva cancelada com sucesso.');await load()}

  return <main className="container">
    {(successText||pixData)&&<div className="paymentModal"><div className="card paymentModalCard"><div className="successIcon">✓</div><h2>{successText||'Pagamento'}</h2>{pixData&&<><p>Escaneie o QR Code ou use o Pix Copia e Cola.</p>{pixData.imagemQrcode&&<img className="pixQr" src={pixData.imagemQrcode} alt="QR Code PIX"/>}<textarea className="pixCopy" readOnly value={pixData.qrcode||''}/><button className="btn" type="button" onClick={()=>navigator.clipboard.writeText(pixData.qrcode||'')}>Copiar código PIX</button>{pixData.linkVisualizacao&&<a className="btn secondary" href={pixData.linkVisualizacao} target="_blank" rel="noreferrer">Abrir pagamento PIX</a>}</>}<button className="btn" type="button" onClick={()=>{setSuccessText('');setPixData(null)}}>Fechar</button></div></div>}
    <section className="hero"><h1>Escolha seu veículo</h1><p>Veja as fotos, categorias e valores. Clique no veículo para iniciar a reserva.</p></section>
    {!userId&&<div className="card"><p>Para reservar, entre na sua conta.</p><a className="btn" href="/login">Entrar / Criar conta</a></div>}
    <section className="section"><div className="categoryTabs">{categories.map(c=><button key={c} type="button" className={`categoryTab ${category===c?'active':''}`} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="vehicleCatalog">{visibleVehicles.length===0?<div className="card"><p>Nenhum veículo livre nesta categoria.</p></div>:visibleVehicles.map(v=><button type="button" className="vehicleCard" key={v.id} onClick={()=>chooseVehicle(v)}><div className="vehiclePhotoArea">{v.image_url?<img src={v.image_url} alt={v.name}/>:<div className="vehicleNoPhoto">Sem foto</div>}<span className="availabilityBadge">LIVRE</span></div><div className="vehicleCardBody"><span className="vehicleCategory">{v.category||'Econômico'}</span><h3>{v.name}</h3><strong>R$ {Number(v.daily_rate).toFixed(2)}/dia</strong><span className="vehicleReserveHint">Clique para reservar</span></div></button>)}</div></section>
    <form id="form-reserva" className="card form section" onSubmit={submit}><h2>{selected?`Reservar ${selected.name}`:'Faça sua reserva'}</h2><label>Veículo<select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required><option value="">Selecione</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name} — {v.category} — R$ {Number(v.daily_rate).toFixed(2)}/dia</option>)}</select></label>{selected&&<div className="selectedVehiclePreview">{selected.image_url&&<div className="vehicleImageWrap"><img src={selected.image_url} alt={selected.name}/><span className="availabilityBadge">LIVRE</span></div>}<div><strong>{selected.name}</strong><p>{selected.category} • R$ {Number(selected.daily_rate).toFixed(2)}/dia</p></div></div>}<label>Telefone com DDD *<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(62) 99999-9999" required/></label><label>Retirada<input type="datetime-local" value={pickup} onChange={e=>setPickup(e.target.value)} required/></label><label>Devolução<input type="datetime-local" value={returnAt} onChange={e=>setReturnAt(e.target.value)} required/></label><div><strong>Forma de pagamento</strong><div className="paymentOptions">{paymentSettings.pix_enabled&&<label className={`paymentOption ${payment==='pix'?'selected':''}`}><span><input type="radio" name="payment" checked={payment==='pix'} onChange={()=>setPayment('pix')}/>PIX</span><small>QR Code e copia e cola • sem acréscimo</small></label>}{paymentSettings.card_enabled&&<label className={`paymentOption ${payment==='card'?'selected':''}`}><span><input type="radio" name="payment" checked={payment==='card'} onChange={()=>setPayment('card')}/>Cartão</span><small>Acréscimo de {Number(paymentSettings.card_fee_percent).toFixed(1)}%</small></label>}</div></div>
    {payment==='card'&&<div className="cardFields"><h3>Dados do cartão</h3><p className="feeNote">Os dados são tokenizados diretamente pela Efí e não são salvos no AGENDA-GO.</p>{!payeeCode&&<p className="message">Cartão aguardando configuração do Identificador de conta Efí.</p>}<label>Nome do titular<input value={cardHolder} onChange={e=>setCardHolder(e.target.value)} required/></label><label>CPF do titular<input value={cardCpf} onChange={e=>setCardCpf(e.target.value)} placeholder="000.000.000-00" required/></label><label>Número do cartão<input inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" required/></label><div className="cardRow"><label>Mês<input inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} value={cardMonth} onChange={e=>setCardMonth(e.target.value)} placeholder="MM" required/></label><label>Ano<input inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} value={cardYear} onChange={e=>setCardYear(e.target.value)} placeholder="AAAA" required/></label><label>CVV<input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cardCvv} onChange={e=>setCardCvv(e.target.value)} placeholder="123" required/></label></div></div>}
    <div className="summary"><strong>{estimatedDays||0} diária(s)</strong><span>Reserva: R$ {estimate.toFixed(2)}</span><span>Taxa: R$ {fee.toFixed(2)}</span><span><strong>Total: R$ {paymentTotal.toFixed(2)}</strong></span></div><button className="btn" type="submit" disabled={!userId||processing}>{processing?'Processando pagamento...':'Confirmar reserva e pagar'}</button>{message&&<p className="message">{message}</p>}</form>
    <section className="section"><div className="card"><h2>Minhas reservas</h2><p>O cancelamento pelo usuário é permitido somente até 2 horas antes do horário de retirada.</p>{reservations.length===0?<p>Nenhuma reserva cadastrada.</p>:reservations.map(r=><div key={r.id} className="rowItem">{r.vehicles?.image_url&&<img src={r.vehicles.image_url} alt={r.vehicles.name} style={{width:130,height:80,objectFit:'cover',borderRadius:10,border:'2px solid #111'}}/>}<strong>{r.vehicles?.name||'Veículo'}</strong><span>{new Date(r.pickup_at).toLocaleString('pt-BR')} → {new Date(r.return_at).toLocaleString('pt-BR')}</span><span>Pagamento: {r.payment_method==='card'?'Cartão':'PIX'} • {r.payment_status==='paid'?'Pago':'Pendente'}</span>{r.card_mask&&<span>Cartão: {r.card_mask}</span>}<span>{r.days} diária(s) • Total: R$ {Number(r.payment_total??r.total).toFixed(2)} • {statusLabel[r.status]||r.status}</span>{r.payment_method==='pix'&&r.pix_link&&r.payment_status!=='paid'&&<a className="btn secondary" href={r.pix_link} target="_blank" rel="noreferrer">Pagar PIX</a>}{canCancel(r)?<button className="btn secondary" type="button" disabled={cancellingId===r.id} onClick={()=>cancelReservation(r)}>{cancellingId===r.id?'Cancelando...':'Cancelar reserva'}</button>:r.status!=='cancelled'&&<small>Cancelamento indisponível nesta etapa ou faltam menos de 2 horas para a retirada.</small>}</div>)}</div></section>
  </main>
}
