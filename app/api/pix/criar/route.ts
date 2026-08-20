import {NextResponse} from 'next/server'
import {createPixCharge} from '../../../../lib/efi'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const body=await request.json()
    const amount=Number(body?.amount)
    if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'Valor inválido.'},{status:400})
    const result=await createPixCharge({amount,name:body?.name,cpf:body?.cpf,description:body?.description||'Reserva AGENDA-GO',expiration:Number(body?.expiration)||1800})
    return NextResponse.json({txid:result.charge?.txid,status:result.charge?.status,locationId:result.charge?.loc?.id,qrcode:result.qr?.qrcode,imagemQrcode:result.qr?.imagemQrcode,linkVisualizacao:result.qr?.linkVisualizacao})
  }catch(error:any){
    console.error('Erro Efí Pix:',error?.message)
    return NextResponse.json({error:error?.message||'Não foi possível gerar a cobrança Pix.'},{status:500})
  }
}
