import {NextRequest,NextResponse} from 'next/server'
import {randomBytes} from 'crypto'
import {supabaseAdmin} from '../../../../../lib/supabase-admin'

export async function POST(req:NextRequest){
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
    if(!token)return NextResponse.json({error:'Não autenticado.'},{status:401})
    const admin=supabaseAdmin()
    const {data:{user},error:userError}=await admin.auth.getUser(token)
    if(userError||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401})
    const {data:caller}=await admin.from('profiles').select('is_super_admin').eq('id',user.id).single()
    if(!caller?.is_super_admin)return NextResponse.json({error:'Acesso exclusivo do Super Admin.'},{status:403})

    const body=await req.json()
    const companyId=String(body.companyId||'')
    const email=String(body.email||'').trim().toLowerCase()
    const fullName=String(body.fullName||'Administrador da locadora').trim()
    if(!companyId||!email)return NextResponse.json({error:'Locadora e e-mail do administrador são obrigatórios.'},{status:400})

    const {data:company}=await admin.from('companies').select('id,name').eq('id',companyId).single()
    if(!company)return NextResponse.json({error:'Locadora não encontrada.'},{status:404})

    const temporaryPassword=`Ag!${randomBytes(9).toString('base64url')}9`
    const {data:created,error:createError}=await admin.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true,user_metadata:{full_name:fullName}})
    if(createError)return NextResponse.json({error:createError.message},{status:400})
    if(!created.user)return NextResponse.json({error:'Não foi possível criar o administrador.'},{status:500})

    const {error:profileError}=await admin.from('profiles').upsert({id:created.user.id,full_name:fullName,role:'admin',company_id:companyId,blocked:false,is_super_admin:false,updated_at:new Date().toISOString()},{onConflict:'id'})
    if(profileError){
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({error:'Falha ao vincular administrador à locadora: '+profileError.message},{status:500})
    }

    const origin=req.nextUrl.origin
    return NextResponse.json({ok:true,email,temporaryPassword,adminUrl:`${origin}/login`,panelUrl:`${origin}/admin`,publicUrl:null,companyName:company.name})
  }catch(err:any){return NextResponse.json({error:err?.message||'Erro ao criar administrador da locadora.'},{status:500})}
}
