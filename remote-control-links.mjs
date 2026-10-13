export function remoteControlUrl(url){
 const value=String(url??'').trim();let parsed;
 if(value){try{parsed=new URL(value);}catch{throw Error('Geçerli Claude konuşma bağlantısını yapıştır.');}
  if(value.length>2000||parsed.protocol!=='https:'||parsed.hostname!=='claude.ai'||parsed.port||parsed.username||parsed.password||!/^\/code(?:\/|$)/.test(parsed.pathname))throw Error('Yalnızca https://claude.ai/code altındaki konuşma bağlantıları kabul edilir.');
 }
 return value;
}
