import {NextResponse} from 'next/server'

export const runtime='nodejs'

export async function GET(){
  const payeeCode=process.env.EFI_PAYEE_CODE||''
  return NextResponse.json({payeeCode,environment:process.env.EFI_SANDBOX==='true'?'sandbox':'production'})
}
