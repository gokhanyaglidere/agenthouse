import http from 'node:http';
import {createRemoteJWKSet,jwtVerify} from 'jose';
export const verifiedWebViewer=Symbol('verified-web-viewer');
export function observerPrincipal(req,policy){const webLogin=req[verifiedWebViewer];return {owner:webLogin===undefined&&policy.canWrite(req.headers),login:webLogin??policy.identity(req.headers)};}
export function webObserverConfig(env=process.env){
 if(env.AGENTHOUSE_WEB_VIEWERS!=='1')return null;
 const issuer=env.AGENTHOUSE_ACCESS_ISSUER,audience=env.AGENTHOUSE_ACCESS_AUDIENCE,origin=env.AGENTHOUSE_VIEWER_ORIGIN;
 const port=Number(env.AGENTHOUSE_VIEWER_PORT??3101);
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer??'')||!/^https:\/\/[a-z0-9.-]+$/.test(origin??'')||!audience||audience.length>256||!Number.isInteger(port)||port<1024||port>65535||port===Number(env.BIBILEN_GATEWAY_PORT??3100))throw Error('Web viewer configuration is incomplete or invalid.');
 return {issuer,audience,origin,port};
}
export function webObserverVerifier(config,keyResolver){
 const keys=keyResolver??createRemoteJWKSet(new URL(config.issuer+'/cdn-cgi/access/certs'),{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:600000});
 return async token=>{
  if(typeof token!=='string'||token.length>16384)throw Error('Authentication required');
  const {payload}=await jwtVerify(token,keys,{issuer:config.issuer,audience:config.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],clockTolerance:5});
  if(payload.type!=='app'||typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||payload.email.length>200||!/^\S+@\S+\.\S+$/.test(payload.email)||!Number.isSafeInteger(payload.iat)||payload.iat>Date.now()/1000+5)throw Error('Invalid user identity');
  return payload.email.toLowerCase();
 };
}
export function createWebObserverServer({config,verify=webObserverVerifier(config),api,page}){
 const deny=(res,status,message)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:message}));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  try{
   const url=new URL(req.url,config.origin);
   if(req.headers.host!==new URL(config.origin).host||req.headers['x-forwarded-proto']!=='https'||url.origin!==config.origin){deny(res,403,'Bu adresten erişime izin verilmiyor.');return;}
   if(!['GET','HEAD'].includes(req.method)){deny(res,403,'Bu ekran yalnızca izleme içindir.');return;}
   const apiPath=['/bibilen/api/viewer/projects','/bibilen/api/viewer/state'].includes(url.pathname);
   const pagePath=['/','/observer.html'].includes(url.pathname)||/^\/assets\/[a-zA-Z0-9._-]+\.(js|css|png|woff2?)$/.test(url.pathname);
   if(!apiPath&&!pagePath){deny(res,404,'Bulunamadı.');return;}
   // Neither Tailscale headers nor an owner email can turn this listener into an operator.
   let login;try{login=await verify(req.headers['cf-access-jwt-assertion']);}catch{deny(res,401,'Giriş doğrulanamadı. Bağlantıyı yeniden açıp giriş yap.');return;}
   const viewerRequest={method:req.method,headers:{},[verifiedWebViewer]:login};
   if(apiPath){if(req.method!=='GET'){deny(res,405,'Desteklenmeyen işlem.');return;}await api(viewerRequest,res,url);}else await page(viewerRequest,res,url);
  }catch{if(!res.headersSent)deny(res,503,'İzleyici bağlantısı şu an kullanılamıyor.');else res.end();}
 });
 server.on('upgrade',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
 server.headersTimeout=10000;server.requestTimeout=15000;server.keepAliveTimeout=5000;
 return server;
}
