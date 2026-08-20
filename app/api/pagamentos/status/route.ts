import {NextResponse} from 'next/server'

export const runtime='nodejs'

export async function GET(){
  return NextResponse.json({
    pix:{
      clientId:Boolean(process.env.EFI_CLIENT_ID),
      clientSecret:Boolean(process.env.EFI_CLIENT_SECRET),
      certificate:Boolean(process.env.EFI_CERTIFICATE_BASE64),
      pixKey:Boolean(process.env.EFI_PIX_KEY)
    },
    card:{
      clientId:Boolean(process.env.EFI_CLIENT_ID),
      clientSecret:Boolean(process.env.EFI_CLIENT_SECRET),
      payeeCode:Boolean(process.env.EFI_PAYEE_CODE)
    },
    environment:process.env.EFI_SANDBOX==='true'?'sandbox':'production'
  })
}
