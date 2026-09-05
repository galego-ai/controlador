import {NextResponse} from 'next/server'
import {efiAccessToken} from '../../../lib/efi'
export const runtime='nodejs'

const receiver='https://rmlbmacoqnynqdqmxecz.supabase.co/functions/v1/efi-credential-receive-20260905-q4n8'

export async function GET(){
  const configured={
    clientId:Boolean(process.env.EFI_CLIENT_ID),
    clientSecret:Boolean(process.env.EFI_CLIENT_SECRET),
    certificate:Boolean(process.env.EFI_CERTIFICATE_BASE64),
    pixKey:Boolean(process.env.EFI_PIX_KEY),
    environment:process.env.EFI_SANDBOX==='true'?'sandbox':'production'
  }
  try{
    const token=await efiAccessToken()
    return NextResponse.json({ok:true,configured,tokenPresent:Boolean(token)})
  }catch(error:any){
    const message=String(error?.message||'EFI_TEST_FAILED')
    return NextResponse.json({ok:false,configured,error:message.includes('não configurad')?'MISSING_CONFIG':'EFI_AUTH_FAILED'},{status:200})
  }
}

export async function POST(){
  try{
    const clientId=process.env.EFI_CLIENT_ID||''
    const clientSecret=process.env.EFI_CLIENT_SECRET||''
    const pixKey=process.env.EFI_PIX_KEY||''
    if(!clientId||!clientSecret||!pixKey)return NextResponse.json({ok:false,error:'MISSING_CONFIG'},{status:500})
    const response=await fetch(receiver,{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({clientId,clientSecret,pixKey}),cache:'no-store'})
    let data:any={};try{data=await response.json()}catch{}
    return NextResponse.json({ok:Boolean(response.ok&&data?.ok),verified:Boolean(data?.verified),stored:Boolean(data?.stored),providerStatus:data?.providerStatus??null},{status:response.ok?200:502})
  }catch{
    return NextResponse.json({ok:false,error:'TRANSFER_FAILED'},{status:500})
  }
}
