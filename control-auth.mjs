const gatewayPort=Number(process.env.BIBILEN_GATEWAY_PORT??3100);
const LOCAL_HOSTS = new Set([`127.0.0.1:${gatewayPort}`, `localhost:${gatewayPort}`]);
const REMOTE_HOST = (process.env.BIBILEN_REMOTE_HOST ?? '').trim().toLowerCase();
export function validHost(host){
  const normalized = typeof host === 'string' ? host.trim().toLowerCase() : '';
  return LOCAL_HOSTS.has(normalized) || (REMOTE_HOST.length > 0 && normalized === REMOTE_HOST);
}
export function validOrigin(headers){
  if(!validHost(headers.host))return false;
  let origin;try{origin=new URL(headers.origin);}catch{return false;}
  const host=String(headers.host).toLowerCase();
  const expectedProtocol=LOCAL_HOSTS.has(host)?'http:':'https:';
  return origin.protocol===expectedProtocol && origin.host.toLowerCase()===host;
}
export function authorizedRequest(headers,method){
  if(!validHost(headers.host))return false;
  if(headers.origin!==undefined)return validOrigin(headers);
  return ['GET','HEAD'].includes(method)&&(!headers['sec-fetch-site']||['same-origin','none'].includes(headers['sec-fetch-site']));
}
export function authorizedControl(headers){
  if(!validOrigin(headers))return false;
  const protocols=(headers['sec-websocket-protocol']??'').split(',').map(s=>s.trim());
  return protocols.length===1&&protocols[0]==='bibilen-control';
}
