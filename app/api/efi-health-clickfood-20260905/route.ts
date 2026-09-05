import {NextResponse} from 'next/server'
import {createCipheriv,createHash,publicEncrypt,randomBytes,constants} from 'node:crypto'
import {efiAccessToken} from '../../../lib/efi'
export const runtime='nodejs'

const publicKey=`-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAh38KwH50ftbIZwChPjD8
/UJnq+KewaUIWt6WFoSDwrsuvZsL9j8pHvc+PwbaA4Ehj8wHE83N8Zn4fsRxbBP8
2lyt+xgQ/eq01czGtZ5YWAJIQw30YFv6nHnSVB4SwIAv/+IWanss/8fTqoCiBaow
3todEnZ55bIDJAWyQcUkjRMNLPCtoU4BrR+zK/FqlSTuKkkiZMlwie+N2BUlNpPq
Iz6+3VTo2BpQVMwaa2RJ6hwcoQDfUMK9T/3LBKOWI+n97axFLZg6/dgShJ2gOcqJ
HRnqb1rQOb9WcDJhFKrYMd8CvA37nnGoEhlB8tVdHQY4o7KIDZUpLfzWECaXozc7
8ykNLxo9IH3G/lDFunvoaZkLB7Q+lhgxnWDHCjf0ZvzwlWD3//uuozn9z9QMU+6w
4YbxVfucqgCd+3MIg5Bcs0kVK6yDY93LJdQwd6lgGITPPPF7lkmB7d2G7bLgQ1k1
YanajVrcHET2svzDmdZhFHX5krXvh1eBUfSy3trbLlIpAgMBAAE=
-----END PUBLIC KEY-----`

function certificateSha256(){
  const raw=(process.env.EFI_CERTIFICATE_BASE64||'').replace(/\s/g,'')
  if(!raw)return null
  return createHash('sha256').update(Buffer.from(raw,'base64')).digest('hex')
}

function encryptedExport(){
  const clientId=process.env.EFI_CLIENT_ID||''
  const clientSecret=process.env.EFI_CLIENT_SECRET||''
  const pixKey=process.env.EFI_PIX_KEY||''
  const p12Base64=(process.env.EFI_CERTIFICATE_BASE64||'').replace(/\s/g,'')
  if(!clientId||!clientSecret||!pixKey||!p12Base64)throw new Error('MISSING_CONFIG')
  const aesKey=randomBytes(32)
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',aesKey,iv)
  cipher.setAAD(Buffer.from('clickfood-efi-transfer-v1'))
  const plaintext=Buffer.from(JSON.stringify({clientId,clientSecret,pixKey,p12Base64}),'utf8')
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()])
  const tag=cipher.getAuthTag()
  const wrappedKey=publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aesKey)
  return {alg:'RSA-OAEP-3072+A256GCM',wrappedKey:wrappedKey.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ciphertext.toString('base64')}
}

export async function GET(req:Request){
  const configured={clientId:Boolean(process.env.EFI_CLIENT_ID),clientSecret:Boolean(process.env.EFI_CLIENT_SECRET),certificate:Boolean(process.env.EFI_CERTIFICATE_BASE64),pixKey:Boolean(process.env.EFI_PIX_KEY),environment:process.env.EFI_SANDBOX==='true'?'sandbox':'production'}
  try{
    const token=await efiAccessToken()
    const url=new URL(req.url)
    if(url.searchParams.get('export')==='1')return NextResponse.json({ok:true,tokenPresent:Boolean(token),certificateSha256:certificateSha256(),sealed:encryptedExport()},{headers:{'Cache-Control':'no-store'}})
    return NextResponse.json({ok:true,configured,tokenPresent:Boolean(token),certificateSha256:certificateSha256()},{headers:{'Cache-Control':'no-store'}})
  }catch(error:any){
    const message=String(error?.message||'EFI_TEST_FAILED')
    return NextResponse.json({ok:false,configured,error:message.includes('não configurad')?'MISSING_CONFIG':'EFI_AUTH_FAILED',certificateSha256:certificateSha256()},{status:200,headers:{'Cache-Control':'no-store'}})
  }
}
