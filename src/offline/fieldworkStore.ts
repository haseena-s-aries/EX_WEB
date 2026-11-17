/** Browser fieldwork vault. No project data, photos, queue or credentials in localStorage. */
export type VaultSession = {id:string; email:string; name:string; role:string; expires:number; token:string};
type Envelope = {key:string; account:string; type:string; iv:Uint8Array; data:ArrayBuffer};
type Account = {key:string; account:string; type:'account'; salt:Uint8Array; verifier:Envelope};
let database:Promise<IDBDatabase>|undefined;
let session:VaultSession|undefined;
let encryptionKey:CryptoKey|undefined;
const listeners = new Set<()=>void>();
export const fieldworkChanged = () => listeners.forEach(fn=>fn());
export const onFieldworkChange = (fn:()=>void) => {listeners.add(fn); return ()=>{listeners.delete(fn);};};
export const fieldworkSession = () => session;
export const lockFieldwork = () => {session=undefined; encryptionKey=undefined; fieldworkChanged();};
export const stableId = () => crypto.randomUUID();

function db() {
  if (!database) database=new Promise((resolve,reject)=>{
    const request=indexedDB.open('ex-survey-fieldwork-v1',1);
    request.onupgradeneeded=()=>{const s=request.result.createObjectStore('vault',{keyPath:'key'});s.createIndex('account','account');};
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=undefined;};resolve(request.result);};
    request.onerror=()=>{database=undefined;reject(request.error);};
    request.onblocked=()=>reject(new Error('Close other Ex-Survey tabs to update offline storage.'));
  });
  return database;
}
async function read<T>(key:string):Promise<T|undefined> {
  const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('vault').objectStore('vault').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function write(rows:(Envelope|Account)[]) {
  const d=await db();return new Promise<void>((resolve,reject)=>{
    const tx=d.transaction('vault','readwrite');rows.forEach(row=>tx.objectStore('vault').put(row));
    tx.oncomplete=()=>{fieldworkChanged();resolve();};
    tx.onabort=tx.onerror=()=>reject(new Error(tx.error?.name==='QuotaExceededError'
      ? 'Device storage is full. This change was NOT saved. Free space or sync existing work, then retry.' : 'Device save failed. Keep this screen open and retry.'));
  });
}
async function derive(password:string,salt:Uint8Array) {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encrypt(key:CryptoKey,account:string,id:string,type:string,bytes:BufferSource):Promise<Envelope> {
  const iv=crypto.getRandomValues(new Uint8Array(12));const storageKey=account+'/'+id;
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(storageKey)},key,bytes);
  return {key:storageKey,account,type,iv,data};
}
async function decrypt(key:CryptoKey,row:Envelope) {
  return crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv as BufferSource,additionalData:new TextEncoder().encode(row.key)},key,row.data);
}
function requireSession() {
  if(!session||!encryptionKey||Date.now()>=session.expires) throw new Error('Offline authorization expired. Sign in online to continue. Your saved work is retained.');
  return {session,key:encryptionKey};
}
export async function establishFieldwork(user:VaultSession,password:string) {
  lockFieldwork();
  if(user.role!=='Surveyor') {lockFieldwork();return;}
  const account=user.email.trim().toLowerCase();const existing=await read<Account>('account/'+account);
  if(existing&&existing.account!==user.id)throw new Error('This email belongs to a different cached account. The original device data remains locked.');
  const salt=existing?.salt??crypto.getRandomValues(new Uint8Array(16));const key=await derive(password,salt);
  if(existing) {
    // A password change must not silently destroy the only key to unsynced work.
    try {await decrypt(key,existing.verifier);} catch {throw new Error('This device vault uses your previous password. Unlock and synchronize it before changing the vault password.');}
  }
  const verifier=await encrypt(key,user.id,'session','session',new TextEncoder().encode(JSON.stringify(user)));
  await write([{key:'account/'+account,account:user.id,type:'account',salt,verifier}]);
  session=user;encryptionKey=key;fieldworkChanged();
  await navigator.storage?.persist?.();
}
export async function unlockFieldwork(email:string,password:string):Promise<VaultSession> {
  lockFieldwork();
  const account=await read<Account>('account/'+email.trim().toLowerCase());
  if(!account) throw new Error('Sign in online and download an assigned project on this device first.');
  const key=await derive(password,account.salt);let restored:VaultSession;
  try {restored=JSON.parse(new TextDecoder().decode(await decrypt(key,account.verifier)));}
  catch {throw new Error('Could not unlock this device workspace. Check your password.');}
  if(Date.now()>=restored.expires) throw new Error('Offline authorization expired. Connect and sign in again. Saved fieldwork is retained.');
  session=restored;encryptionKey=key;fieldworkChanged();return restored;
}
export async function vaultGet<T>(id:string):Promise<T|undefined> {
  const {session:s,key}=requireSession();const row=await read<Envelope>(s.id+'/'+id);
  const result=row?JSON.parse(new TextDecoder().decode(await decrypt(key,row))):undefined;
  if(session?.id!==s.id||encryptionKey!==key)throw new Error('Account changed while reading offline data.');
  return result;
}
export async function vaultList<T>(type:string):Promise<T[]> {
  const {session:s,key}=requireSession();const d=await db();
  const rows=await new Promise<Envelope[]>((resolve,reject)=>{const r=d.transaction('vault').objectStore('vault').index('account').getAll(s.id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const result=await Promise.all(rows.filter(r=>r.type===type).map(async row=>JSON.parse(new TextDecoder().decode(await decrypt(key,row)))));
  if(session?.id!==s.id||encryptionKey!==key)throw new Error('Account changed while reading offline data.');
  return result;
}
/** Encrypt first, then atomically commit document, queue and any files together. */
export async function vaultSave(rows:{id:string;type:string;value:unknown}[],files:{id:string;blob:Blob}[]=[]) {
  const {session:s,key}=requireSession();
  const envelopes=await Promise.all(rows.map(r=>encrypt(key,s.id,r.id,r.type,new TextEncoder().encode(JSON.stringify(r.value)))));
  for(const file of files) envelopes.push(await encrypt(key,s.id,file.id,'blob',await file.blob.arrayBuffer()));
  if(session?.id!==s.id||encryptionKey!==key)throw new Error('The account was locked during saving. Sign in to the original account and retry.');
  await write(envelopes);
}
export async function vaultBlob(id:string,mime:string):Promise<Blob> {
  const {session:s,key}=requireSession();const row=await read<Envelope>(s.id+'/'+id);
  if(!row)throw new Error('The downloaded file is missing. Download this project again while online.');
  return new Blob([await decrypt(key,row)],{type:mime});
}
