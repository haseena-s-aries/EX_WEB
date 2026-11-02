import {NativeModules, Platform} from 'react-native';
import {offlineInspectionService} from '../offline/offlineInspectionService';

export type IdentifierTechnology='HF_RFID'|'NFC'|'QR';
export type EquipmentScanResult={technology:IdentifierTechnology;identifier:string;source:'NFC'|'QR_CAMERA'|'RFID_READER'|'MANUAL'|'SIMULATED'};
export interface EquipmentScannerAdapter {scan():Promise<EquipmentScanResult>;}
type NativeScanner={nfcSupported:boolean;startNfcScan():Promise<{identifier:string;technology:'NFC'}>;stopNfcScan():Promise<boolean>;decodeQrCode(uri:string):Promise<{identifier:string;technology:'QR'}>};
const native=NativeModules.ExSurveyEquipmentScanner as NativeScanner|undefined;

export function normalizeIdentifier(value:string,technology:IdentifierTechnology):string{
 const input=value.trim().normalize('NFKC');
 if(technology==='QR')return input;
 return input.replace(/[\s:-]/g,'').toUpperCase();
}
export const nativeNfcSupported=Platform.OS==='android'&&!!native?.nfcSupported;

export class NativeNfcScanner implements EquipmentScannerAdapter{
 async scan():Promise<EquipmentScanResult>{if(!nativeNfcSupported||!native)throw new Error('Android NFC is not available on this device.');const result=await native.startNfcScan();return{technology:'NFC',identifier:normalizeIdentifier(result.identifier,'NFC'),source:'NFC'};}
 stop(){return native?.stopNfcScan();}
}
export async function decodeQrCodeImage(uri:string):Promise<EquipmentScanResult>{if(Platform.OS!=='android'||!native)throw new Error('QR decoding is available in the Android native app.');const result=await native.decodeQrCode(uri);return{technology:'QR',identifier:normalizeIdentifier(result.identifier,'QR'),source:'QR_CAMERA'};}
export class SimulatedScanner implements EquipmentScannerAdapter{
 private result:EquipmentScanResult;
 constructor(result:EquipmentScanResult){this.result=result;}
 async scan(){return{...this.result,source:'SIMULATED' as const};}
}
export async function findOfflineEquipment(accountId:string,identifier:string,technology:IdentifierTechnology){
 const packages=await offlineInspectionService.packages(accountId);
 const expected=normalizeIdentifier(identifier,technology);const matches:any[]=[];
 for(const pkg of packages)for(const task of pkg.tasks||[]){const equipment=task.equipment||{};const ids=equipment.identifiers||[];if(equipment.rfidTagUid&&['HF_RFID','NFC'].includes(technology)&&normalizeIdentifier(equipment.rfidTagUid,technology)===expected)matches.push({pkg,task});if(ids.some((x:any)=>x.technology===technology&&normalizeIdentifier(x.identifier,technology)===expected))matches.push({pkg,task});}
 const unique=[...new Map(matches.map(x=>[x.task.equipment.equipmentId,x])).values()];
 if(unique.length>1)return{state:'duplicate' as const,matches:unique};if(!unique.length)return{state:'unknown' as const,matches:[]};const equipmentId=unique[0].task.equipment.equipmentId;return{state:'matched' as const,equipment:unique[0].task.equipment,activeTasks:matches.filter(x=>x.task.equipment.equipmentId===equipmentId).map(x=>({...x.task,packageReference:x.pkg.reference})),packages:unique.map(x=>x.pkg)};
}

export async function searchOfflineEquipment(accountId:string,query:string){
 const packages=await offlineInspectionService.packages(accountId);const term=query.trim().toLocaleLowerCase();const matches:any[]=[];
 if(term.length<2)return[];for(const pkg of packages)for(const task of pkg.tasks||[]){const e=task.equipment||{};if(String(e.tagNumber||'').toLocaleLowerCase().includes(term)||String(e.equipmentCode||'').toLocaleLowerCase().includes(term))matches.push({pkg,task});}
 return [...new Map(matches.map(x=>[`${x.task.equipment.equipmentId}:${x.pkg.id}`,x])).values()];
}
