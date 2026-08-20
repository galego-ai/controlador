import https from 'node:https'

const productionBase='https://pix.api.efipay.com.br'
const sandboxBase='https://pix-h.api.efipay.com.br'

type Json=Record<string,any>

function baseUrl(){return process.env.EFI_SANDBOX==='true'?sandboxBase:productionBase}
function certificate(){
  const raw=process.env.EFI_CERTIFICATE_BASE64
  if(!raw)throw new Error('EFI_CERTIFICATE_BASE64 não configurado.')
  return Buffer.from(raw.replace(/\s/g,''),'base64')
}

function requestJson(path:string,method:string,headers:Record<string,string>,body?:Json):Promise<Json>{
  const url=new URL(path,baseUrl())
  const payload=body?JSON.stringify(body):undefined
  return new Promise((resolve,reject)=>{
    const req=https.request({hostname:url.hostname,path:url.pathname+url.search,method,pfx:certificate(),passphrase:process.env.EFI_CERTIFICATE_PASSWORD||'',headers:{Accept:'application/json','Content-Type':'application/json',...headers,...(payload?{'Content-Length':Buffer.byteLength(payload).toString()}:{})}},res=>{
      let data='';res.on('data',c=>data+=c);res.on('end',()=>{let parsed:any={};try{parsed=data?JSON.parse(data):{}}catch{parsed={raw:data}}if((res.statusCode||500)>=400)return reject(new Error(parsed?.mensagem||parsed?.detail||`Efí HTTP ${res.statusCode}`));resolve(parsed)})
    })
    req.on('error',reject);if(payload)req.write(payload);req.end()
  })
}

export async function efiAccessToken(){
  const clientId=process.env.EFI_CLIENT_ID,clientSecret=process.env.EFI_CLIENT_SECRET
  if(!clientId||!clientSecret)throw new Error('Credenciais EFI_CLIENT_ID/EFI_CLIENT_SECRET não configuradas.')
  const basic=Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const data=await requestJson('/oauth/token','POST',{Authorization:`Basic ${basic}`},{grant_type:'client_credentials'})
  if(!data.access_token)throw new Error('A Efí não retornou access_token.')
  return data.access_token as string
}

export async function createPixCharge(input:{amount:number;name?:string;cpf?:string;description?:string;expiration?:number}){
  const pixKey=process.env.EFI_PIX_KEY
  if(!pixKey)throw new Error('EFI_PIX_KEY não configurado.')
  const token=await efiAccessToken()
  const body:any={calendario:{expiracao:input.expiration||1800},valor:{original:input.amount.toFixed(2)},chave:pixKey,solicitacaoPagador:input.description||'Reserva AGENDA-GO'}
  if(input.name&&input.cpf){const cpf=input.cpf.replace(/\D/g,'');if(cpf.length===11)body.devedor={cpf,nome:input.name}}
  const charge=await requestJson('/v2/cob','POST',{Authorization:`Bearer ${token}`},body)
  const locId=charge?.loc?.id
  if(!locId)throw new Error('Cobrança criada, mas a Efí não retornou o location para gerar QR Code.')
  const qr=await requestJson(`/v2/loc/${locId}/qrcode`,'GET',{Authorization:`Bearer ${token}`})
  return {charge,qr}
}
