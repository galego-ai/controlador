import {NextResponse} from 'next/server'
import {supabaseAdmin} from '../../../../lib/supabase-admin'
export const runtime='nodejs'
export async function GET(){try{const db=supabaseAdmin();const {data}=await db.from('platform_fee_settings').select('card_customer_fee_percent').eq('id',true).single();return NextResponse.json({pixEnabled:true,cardEnabled:Boolean(process.env.EFI_PAYEE_CODE),cardCustomerFeePercent:Number(data?.card_customer_fee_percent||0),environment:process.env.EFI_SANDBOX==='true'?'sandbox':'production'})}catch(error:any){return NextResponse.json({error:error?.message||'Configuração indisponível.'},{status:500})}}
