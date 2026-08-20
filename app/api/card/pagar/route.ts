import {NextResponse} from 'next/server'
import {createCardCharge} from '../../../../lib/efi-charges'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const body=await request.json()
    const amount=Number(body?.amount)
    const paymentToken=String(body?.paymentToken||'')
    const name=String(body?.name||'').trim()
    const cpf=String(body?.cpf||'').replace(/\D/g,'')
    const email=String(body?.email||'').trim()
    const phone=String(body?.phone||'').replace(/\D/g,'')
    const installments=Math.max(1,Number(body?.installments)||1)
    if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'Valor inválido.'},{status:400})
    if(!paymentToken)return NextResponse.json({error:'Token do cartão não informado.'},{status:400})
    if(!name||cpf.length!==11||!email||phone.length<10)return NextResponse.json({error:'Complete nome, CPF, e-mail e telefone do pagador.'},{status:400})
    const result=await createCardCharge({amount,paymentToken,name,cpf,email,phone,installments,description:body?.description||'Reserva AGENDA-GO'})
    return NextResponse.json({code:result?.code,status:result?.data?.status,chargeId:result?.data?.charge_id,total:result?.data?.total,installments:result?.data?.installments,refusal:result?.data?.refusal||null})
  }catch(error:any){
    console.error('Erro Efí Cartão:',error?.message)
    return NextResponse.json({error:error?.message||'Não foi possível processar o cartão.'},{status:500})
  }
}
