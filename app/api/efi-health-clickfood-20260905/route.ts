import {NextResponse} from 'next/server'
import {efiAccessToken} from '../../../lib/efi'
export const runtime='nodejs'
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
