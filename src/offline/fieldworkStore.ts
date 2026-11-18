/** Browser fieldwork vault. No project data, photos, queue or credentials in localStorage.
 *
 * Key hierarchy (vault format v2):
 *   password --PBKDF2(kekSalt)--> key-encryption key (KEK) --AES-GCM--> wrapped data key (DEK)
 *   DEK --AES-GCM(AAD = storage key)--> every document, queue entry and file.
 * A password change therefore only re-wraps the DEK; encrypted rows (including unsynchronized work
 * and photos) are never re-encrypted, moved or deleted. Format v1 vaults (DEK derived directly from
 * the password) are upgraded in place on the next successful unlock: the legacy key becomes the DEK.
 */
export type VaultSession = {id:string; email:string; name:string; role:string;
  /** End of the offline authorization window (local unlock without the server). */
  expires:number;
  token:string;
  /** API access-token expiry. Synchronization pauses after this until the user signs in again. */
  tokenExpires?:number};
type Envelope = {key:string; account:string; type:string; iv:Uint8Array; data:ArrayBuffer};
type Account = {key:string; account:string; type:'account'; salt:Uint8Array; verifier:Envelope;
  /** v2 only. Absent = legacy v1. */
  v?:2; kekSalt?:Uint8Array; wrapIv?:Uint8Array; wrapped?:ArrayBuffer;
  /** Row namespace; defaults to the account id. A fresh vault started after an archive uses a new namespace. */
  ns?:string; email?:string; createdAt?:string};
export type ArchivedVault = {key:string; email:string; archivedAt:string; reason:string};
export type RekeyState = {email:string; userId:string; archived:ArchivedVault[]};

/** Offline window after an online password sign-in. Independent of the 1-hour API token. */
export const OFFLINE_WINDOW_MS = 8*60*60*1000;
let database:Promise<IDBDatabase>|undefined;
let session:VaultSession|undefined;
let encryptionKey:CryptoKey|undefined;
let namespace:string|undefined;
/** Held only between an online sign-in whose password no longer opens the vault and the user's choice. */
let pendingRekey:{user:VaultSession; kek:CryptoKey; kekSalt:Uint8Array}|undefined;
const listeners = new Set<()=>void>();
export const fieldworkChanged = () => listeners.forEach(fn=>fn());
export const onFieldworkChange = (fn:()=>void) => {listeners.add(fn); return ()=>{listeners.delete(fn);};};
export const fieldworkSession = () => session;
export const rekeyRequired = ():RekeyState|undefined => pendingRekey
  ? {email:pendingRekey.user.email, userId:pendingRekey.user.id, archived:[]} : undefined;
export const lockFieldwork = () => {session=undefined; encryptionKey=undefined; namespace=undefined; pendingRekey=undefined; fieldworkChanged();};
export const stableId = () => crypto.randomUUID();
const accountKey = (email:string) => 'account/'+email.trim().toLowerCase();
const PBKDF2_ITERATIONS = 310000;

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
async function readPrefix<T>(prefix:string):Promise<T[]> {
  const d=await db();return new Promise((resolve,reject)=>{
    const r=d.transaction('vault').objectStore('vault').getAll(IDBKeyRange.bound(prefix,prefix+'￿'));
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
}
/** Single IndexedDB transaction: all rows commit together or none do. Deletes are only used for account-record moves. */
async function write(rows:(Envelope|Account)[],deletes:string[]=[]) {
  const d=await db();return new Promise<void>((resolve,reject)=>{
    const tx=d.transaction('vault','readwrite');rows.forEach(row=>tx.objectStore('vault').put(row));deletes.forEach(k=>tx.objectStore('vault').delete(k));
    tx.oncomplete=()=>{fieldworkChanged();resolve();};
    tx.onabort=tx.onerror=()=>reject(new Error(tx.error?.name==='QuotaExceededError'
      ? 'Device storage is full. This change was NOT saved. Free space or sync existing work, then retry.' : 'Device save failed. Keep this screen open and retry.'));
  });
}
async function pbkdf2(password:string,salt:Uint8Array,extractable:boolean,usages:KeyUsage[]) {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},extractable,usages);
}
const deriveKek = (password:string,salt:Uint8Array) => pbkdf2(password,salt,false,['encrypt','decrypt']);
const importDek = (raw:ArrayBuffer) => crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
async function encrypt(key:CryptoKey,account:string,id:string,type:string,bytes:BufferSource):Promise<Envelope> {
  const iv=crypto.getRandomValues(new Uint8Array(12));const storageKey=account+'/'+id;
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(storageKey)},key,bytes);
  return {key:storageKey,account,type,iv,data};
}
async function decrypt(key:CryptoKey,row:Envelope) {
  return crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv as BufferSource,additionalData:new TextEncoder().encode(row.key)},key,row.data);
}
const wrapAad = (account:Account|{key:string}) => new TextEncoder().encode('dek:'+account.key);
async function wrapDek(raw:ArrayBuffer,kek:CryptoKey,recordKey:string) {
  const wrapIv=crypto.getRandomValues(new Uint8Array(12));
  const wrapped=await crypto.subtle.encrypt({name:'AES-GCM',iv:wrapIv,additionalData:wrapAad({key:recordKey})},kek,raw);
  return {wrapIv,wrapped};
}
/** Returns the raw DEK bytes (transient) for a password, or throws if the password does not open this vault. */
async function openDekBytes(account:Account,password:string):Promise<ArrayBuffer> {
  if(account.v===2&&account.wrapped&&account.wrapIv&&account.kekSalt) {
    const kek=await deriveKek(password,account.kekSalt);
    return crypto.subtle.decrypt({name:'AES-GCM',iv:account.wrapIv as BufferSource,additionalData:wrapAad(account)},kek,account.wrapped);
  }
  // Legacy v1: the PBKDF2 output itself encrypted the rows. Re-derive it extractable to become the DEK.
  const legacy=await pbkdf2(password,account.salt,true,['encrypt','decrypt']);
  const raw=await crypto.subtle.exportKey('raw',legacy);
  await decrypt(await importDek(raw),account.verifier);
  return raw;
}
const rowNamespace = (account:Account) => account.ns||account.account;
async function activate(user:VaultSession,account:Account,raw:ArrayBuffer,kek:CryptoKey,kekSalt:Uint8Array,extra:(Envelope|Account)[]=[],deletes:string[]=[]) {
  const dek=await importDek(raw);const ns=rowNamespace(account);
  const {wrapIv,wrapped}=await wrapDek(raw,kek,account.key);
  const verifier=await encrypt(dek,ns,'session','session',new TextEncoder().encode(JSON.stringify(user)));
  const next:Account={...account,type:'account',account:user.id,v:2,kekSalt,wrapIv,wrapped,verifier,ns,email:user.email.trim().toLowerCase(),createdAt:account.createdAt||new Date().toISOString()};
  await write([next,...extra],deletes);
  session=user;encryptionKey=dek;namespace=ns;pendingRekey=undefined;fieldworkChanged();
  try{await navigator.storage?.persist?.();}catch{/* Persistence is best effort; the vault still works. */}
}
function requireSession() {
  if(!session||!encryptionKey||!namespace||Date.now()>=session.expires) throw new Error('Offline authorization expired. Sign in online to continue. Your saved work is retained.');
  return {session,key:encryptionKey,ns:namespace};
}

/**
 * Called after a successful ONLINE password sign-in. Returns 'rekey-required' when this device holds a
 * vault for the account that the new password cannot open (the server password changed). Nothing is
 * deleted; the user chooses to re-key with the previous password or to set the old vault aside.
 */
export async function establishFieldwork(user:VaultSession,password:string):Promise<'ready'|'rekey-required'|'not-applicable'> {
  lockFieldwork();
  if(user.role!=='Surveyor') return 'not-applicable';
  const key=accountKey(user.email);const existing=await read<Account>(key);
  if(existing&&existing.account!==user.id)throw new Error('This email belongs to a different cached account. The original device data remains locked.');
  const kekSalt=crypto.getRandomValues(new Uint8Array(16));const kek=await deriveKek(password,kekSalt);
  if(!existing) {
    const raw=crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer;
    await activate(user,{key,account:user.id,type:'account',salt:crypto.getRandomValues(new Uint8Array(16)),verifier:undefined as any},raw,kek,kekSalt);
    return 'ready';
  }
  let raw:ArrayBuffer;
  try {raw=await openDekBytes(existing,password);}
  catch {pendingRekey={user,kek,kekSalt};fieldworkChanged();return 'rekey-required';}
  await activate(user,existing,raw,kek,kekSalt);
  return 'ready';
}

/** Re-wrap the existing data key for the new password. Requires a prior online sign-in (pending re-key). */
export async function rekeyWithPreviousPassword(previousPassword:string) {
  const pending=pendingRekey;
  if(!pending)throw new Error('Sign in online with your current password first.');
  const existing=await read<Account>(accountKey(pending.user.email));
  if(!existing||existing.account!==pending.user.id)throw new Error('The device vault for this account was not found.');
  let raw:ArrayBuffer;
  try {raw=await openDekBytes(existing,previousPassword);}
  catch {throw new Error('That previous password does not open this device workspace. Nothing was changed.');}
  const audit=await encrypt(await importDek(raw),rowNamespace(existing),'vault-history/'+stableId(),'vault-history',
    new TextEncoder().encode(JSON.stringify({event:'password-rekey',at:new Date().toISOString()})));
  await activate(pending.user,existing,raw,pending.kek,pending.kekSalt,[audit]);
}

/**
 * When the previous password is unknown: keep the old vault (still encrypted, untouched rows) under an
 * archive record and start an empty vault in a new namespace. The archive can be recovered later.
 */
export async function archiveVaultAndStartFresh() {
  const pending=pendingRekey;
  if(!pending)throw new Error('Sign in online with your current password first.');
  const key=accountKey(pending.user.email);const existing=await read<Account>(key);
  if(!existing||existing.account!==pending.user.id)throw new Error('The device vault for this account was not found.');
  const archivedAt=new Date().toISOString();
  const archive:Account={...existing,key:`archived-account/${pending.user.id}/${archivedAt}`};
  // Wrapped-key AAD binds to the record key, so keep the original key inside the archive for unwrapping.
  (archive as any).originalKey=existing.key;(archive as any).archivedAt=archivedAt;(archive as any).reason='password-changed';
  const raw=crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer;
  const fresh:Account={key,account:pending.user.id,type:'account',salt:crypto.getRandomValues(new Uint8Array(16)),verifier:undefined as any,ns:`${pending.user.id}~${stableId()}`};
  await activate(pending.user,fresh,raw,pending.kek,pending.kekSalt,[archive]);
}

export async function archivedVaults():Promise<ArchivedVault[]> {
  const id=session?.id||pendingRekey?.user.id;if(!id)return [];
  return (await readPrefix<any>(`archived-account/${id}/`)).map(a=>({key:a.key,email:a.email||'',archivedAt:a.archivedAt,reason:a.reason}));
}

/**
 * Restore an archived vault with the password that encrypted it, making it the active vault again.
 * Allowed only while the current vault has no unsynchronized work; the current vault is archived, never deleted.
 */
export async function recoverArchivedVault(archiveKey:string,archivePassword:string,currentPassword:string,currentHasPendingWork:boolean) {
  const {session:s}=requireSession();
  if(currentHasPendingWork)throw new Error('Synchronize the current device work first. Recovery never mixes two vaults.');
  const archive=await read<any>(archiveKey);if(!archive||archive.account!==s.id)throw new Error('Archived workspace not found for this account.');
  const current=await read<Account>(accountKey(s.email));if(!current)throw new Error('Current workspace not found.');
  try{await openDekBytes(current,currentPassword);}catch{throw new Error('Enter your current password correctly.');}
  let raw:ArrayBuffer;
  try{raw=await openDekBytes({...archive,key:archive.originalKey||archive.key},archivePassword);}
  catch{throw new Error('That password does not open the archived workspace. Nothing was changed.');}
  const archivedAt=new Date().toISOString();
  const currentArchive:any={...current,key:`archived-account/${s.id}/${archivedAt}`,originalKey:current.key,archivedAt,reason:'replaced-by-recovery'};
  const restored:Account={...archive,key:current.key};delete (restored as any).originalKey;delete (restored as any).archivedAt;delete (restored as any).reason;
  const kekSalt=crypto.getRandomValues(new Uint8Array(16));
  await activate(s,restored,raw,await deriveKek(currentPassword,kekSalt),kekSalt,[currentArchive],[archiveKey]);
}

/** Offline (no server) unlock with the password that currently opens the device vault. */
export async function unlockFieldwork(email:string,password:string):Promise<VaultSession> {
  lockFieldwork();
  const account=await read<Account>(accountKey(email));
  if(!account) throw new Error('Sign in online and download an assigned project on this device first.');
  let raw:ArrayBuffer;let restored:VaultSession;
  try {raw=await openDekBytes(account,password);restored=JSON.parse(new TextDecoder().decode(await decrypt(await importDek(raw),account.verifier)));}
  catch {throw new Error('Could not unlock this device workspace. Check your password. If you changed it recently, use your previous password while offline, or connect and sign in to re-key this device.');}
  if(Date.now()>=restored.expires) throw new Error('Offline authorization expired. Connect and sign in again. Saved fieldwork is retained.');
  if(account.v!==2){const kekSalt=crypto.getRandomValues(new Uint8Array(16));await activate(restored,account,raw,await deriveKek(password,kekSalt),kekSalt);return restored;}
  session=restored;encryptionKey=await importDek(raw);namespace=rowNamespace(account);fieldworkChanged();return restored;
}

export async function vaultGet<T>(id:string):Promise<T|undefined> {
  const {key,ns}=requireSession();const row=await read<Envelope>(ns+'/'+id);
  const result=row?JSON.parse(new TextDecoder().decode(await decrypt(key,row))):undefined;
  if(namespace!==ns||encryptionKey!==key)throw new Error('Account changed while reading offline data.');
  return result;
}
export async function vaultList<T>(type:string):Promise<T[]> {
  const {key,ns}=requireSession();const d=await db();
  const rows=await new Promise<Envelope[]>((resolve,reject)=>{const r=d.transaction('vault').objectStore('vault').index('account').getAll(ns);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const result=await Promise.all(rows.filter(r=>r.type===type).map(async row=>JSON.parse(new TextDecoder().decode(await decrypt(key,row)))));
  if(namespace!==ns||encryptionKey!==key)throw new Error('Account changed while reading offline data.');
  return result;
}
/** Encrypt first, then atomically commit document, queue and any files together. */
export async function vaultSave(rows:{id:string;type:string;value:unknown}[],files:{id:string;blob:Blob}[]=[]) {
  const {key,ns}=requireSession();
  const envelopes=await Promise.all(rows.map(r=>encrypt(key,ns,r.id,r.type,new TextEncoder().encode(JSON.stringify(r.value)))));
  for(const file of files) envelopes.push(await encrypt(key,ns,file.id,'blob',await file.blob.arrayBuffer()));
  if(namespace!==ns||encryptionKey!==key)throw new Error('The account was locked during saving. Sign in to the original account and retry.');
  await write(envelopes);
}
export async function vaultBlob(id:string,mime:string):Promise<Blob> {
  const {key,ns}=requireSession();const row=await read<Envelope>(ns+'/'+id);
  if(!row)throw new Error('The downloaded file is missing. Download this project again while online.');
  return new Blob([await decrypt(key,row)],{type:mime});
}
