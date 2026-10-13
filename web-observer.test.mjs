import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {webObserverConfig,webObserverVerifier,createWebObserverServer,observerPrincipal,verifiedWebViewer} from './web-observer.mjs';
import {AccessPolicy} from './access-policy.mjs';
import WebSocket from 'ws';
import {request as httpRequest} from 'node:http';
const config={issuer:'https://house.cloudflareaccess.com',audience:'house-app',origin:'https://view.example.com',port:3101};
test('public viewer is opt-in and rejects incomplete or unsafe configuration',()=>{
 assert.equal(webObserverConfig({}),null);assert.equal(webObserverConfig({AGENTHOUSE_WEB_VIEWERS:'0'}),null);
 const env={AGENTHOUSE_WEB_VIEWERS:'1',AGENTHOUSE_ACCESS_ISSUER:config.issuer,AGENTHOUSE_ACCESS_AUDIENCE:config.audience,AGENTHOUSE_VIEWER_ORIGIN:config.origin};assert.deepEqual(webObserverConfig(env),config);
 for(const override of [{AGENTHOUSE_ACCESS_ISSUER:'http://localhost'},{AGENTHOUSE_VIEWER_ORIGIN:'https://view.example.com/path'},{AGENTHOUSE_VIEWER_ORIGIN:'http://view.example.com'},{AGENTHOUSE_ACCESS_AUDIENCE:''},{AGENTHOUSE_VIEWER_PORT:'3100'}])assert.throws(()=>webObserverConfig({...env,...override}));
});
test('real JWT signatures, application scope, expiry and user identity are verified',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='valid';const verify=webObserverVerifier(config,createLocalJWKSet({keys:[jwk]}));
 const now=Math.floor(Date.now()/1000);const claims={iss:config.issuer,aud:[config.audience],exp:now+300,iat:now,sub:'user-id',email:'Viewer@Example.com',type:'app'};
 const sign=payload=>new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'valid'}).sign(privateKey);
 assert.equal(await verify(await sign(claims)),'viewer@example.com');
 for(const override of [{iss:'https://other.cloudflareaccess.com'},{aud:['other-app']},{exp:now-60},{iat:now+300},{type:'service'},{email:undefined},{sub:''},{email:'a b@example.com'}])await assert.rejects(verify(await sign({...claims,...override})));
 await assert.rejects(verify('missing'));await assert.rejects(verify('x'.repeat(17000)));
 const {privateKey:foreign}=await generateKeyPair('RS256');await assert.rejects(verify(await new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'valid'}).sign(foreign)));
 await assert.rejects(verify(await new SignJWT(claims).setProtectedHeader({alg:'HS256',kid:'valid'}).sign(new Uint8Array(32))));
});
test('web owner identity stays read-only and cannot gain preview through forged headers',()=>{
 const policy=new AccessPolicy({owners:['owner@example.com']});assert.equal(observerPrincipal({headers:{'tailscale-user-login':'owner@example.com'}},policy).owner,true);
 const viewer=observerPrincipal({headers:{host:'localhost:3100','tailscale-user-login':'owner@example.com'},[verifiedWebViewer]:'owner@example.com'},policy);assert.deepEqual(viewer,{owner:false,login:'owner@example.com'});
});
test('HTTP viewer boundary rejects writes, owner APIs, websocket, spoofed identity and cross-origin requests',async t=>{
 let calls=0;const app=createWebObserverServer({config,verify:async token=>{if(token!=='signed')throw Error();return 'viewer@example.com';},api:(req,res)=>{calls++;assert.deepEqual(req.headers,{});assert.equal(req[verifiedWebViewer],'viewer@example.com');res.end(JSON.stringify({preview:false}));},page:(_req,res)=>res.end('Observer only')});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));const port=app.address().port;
 const request=(path,{method='GET',headers={}}={})=>new Promise((resolve,reject)=>{const req=httpRequest({hostname:'127.0.0.1',port,path,method,headers:{host:'view.example.com','x-forwarded-proto':'https','cf-access-jwt-assertion':'signed',...headers}},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end();});
 assert.equal((await request('/')).status,200);assert.equal((await request('/bibilen/api/viewer/projects',{headers:{'tailscale-user-login':'owner@example.com','x-workspace-id':'fake'}})).status,200);assert.equal(calls,1);
 for(const path of ['/bibilen/api/tasks','/bibilen/api/sessions','/bibilen/api/backups','/bibilen/api/sharing/grants','/ws','/observer.html/../index.html'])assert.equal((await request(path)).status,404);
 for(const method of ['POST','PUT','DELETE'])assert.equal((await request('/bibilen/api/viewer/projects',{method})).status,403);
 for(const headers of [{'cf-access-jwt-assertion':''},{'cf-access-jwt-assertion':'fake','tailscale-user-login':'owner@example.com'}])assert.equal((await request('/bibilen/api/viewer/projects',{headers})).status,401);
 for(const headers of [{host:'localhost:3100'},{'x-forwarded-proto':'http'}])assert.equal((await request('/',{headers})).status,403);
 assert.equal(calls,1);
 await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{headers:{host:'view.example.com','x-forwarded-proto':'https','cf-access-jwt-assertion':'signed'}});ws.on('unexpected-response',(_req,res)=>{res.resume();try{assert.equal(res.statusCode,403);resolve();}catch(e){reject(e);}});ws.on('open',()=>{ws.close();reject(Error('Websocket unexpectedly opened'));});ws.on('error',()=>{});});
});
