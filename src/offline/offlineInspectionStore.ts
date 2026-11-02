import {NativeModules, Platform} from 'react-native';

export type OfflineRecord = {id: string; type: string; payload: string; updatedAt: number};
export type OfflineStorageStats = {bytesUsed: number; recordCount: number; maxBytes: number};

export interface OfflineStoreDriver {
  featureEnabled?: boolean;
  bindAccount(accountId: string): Promise<string>;
  put(accountId: string, id: string, type: string, payload: string): Promise<boolean>;
  get(accountId: string, id: string): Promise<string | null>;
  list(accountId: string, type?: string): Promise<OfflineRecord[]>;
  remove(accountId: string, id: string): Promise<boolean>;
  clearAccount(accountId: string): Promise<number>;
  setOfflinePassword(accountId:string,password:string):Promise<boolean>;
  verifyOfflinePassword(accountId:string,password:string):Promise<boolean>;
  stats(accountId: string): Promise<OfflineStorageStats>;
  storePhoto(accountId: string, id: string, uri: string, mimeType: string, fileName: string, activityId: string, checkpointResponseId?: string): Promise<boolean>;
  exportPhoto(accountId: string, id: string): Promise<string>;
  deleteExportedPhoto(path: string): Promise<boolean>;
  storeDocument(accountId:string,id:string,base64:string,expectedSha256:string,mimeType:string,fileName:string):Promise<boolean>;
  exportDocument(accountId:string,id:string,expectedSha256:string,mimeType:string):Promise<string>;
  deleteDocument(accountId:string,id:string):Promise<boolean>;
  deleteExportedDocument(path:string):Promise<boolean>;
}

const native = NativeModules.ExSurveyOfflineStore as OfflineStoreDriver | undefined;
export const offlineStoreAvailable = Platform.OS === 'android' && !!native && native.featureEnabled === true;

export const androidOfflineStore: OfflineStoreDriver = {
  bindAccount: id => requireNative().bindAccount(id),
  put: (account, id, type, payload) => requireNative().put(account, id, type, payload),
  get: (account, id) => requireNative().get(account, id),
  list: (account, type) => requireNative().list(account, type),
  remove: (account, id) => requireNative().remove(account, id),
  clearAccount: account => requireNative().clearAccount(account),
  setOfflinePassword: (account,password) => requireNative().setOfflinePassword(account,password),
  verifyOfflinePassword: (account,password) => requireNative().verifyOfflinePassword(account,password),
  stats: account => requireNative().stats(account),
  storePhoto: (account, id, uri, mimeType, fileName, activityId, checkpointResponseId) => requireNative().storePhoto(account, id, uri, mimeType, fileName, activityId, checkpointResponseId),
  exportPhoto: (account, id) => requireNative().exportPhoto(account, id),
  deleteExportedPhoto: path => requireNative().deleteExportedPhoto(path),
  storeDocument:(account,id,base64,sha,mime,name)=>requireNative().storeDocument(account,id,base64,sha,mime,name),
  exportDocument:(account,id,sha,mime)=>requireNative().exportDocument(account,id,sha,mime),
  deleteDocument:(account,id)=>requireNative().deleteDocument(account,id),
  deleteExportedDocument:path=>requireNative().deleteExportedDocument(path),
};

function requireNative(): OfflineStoreDriver {
  if (!offlineStoreAvailable || !native) throw new Error('Encrypted offline storage is available only in the configured Android build.');
  return native;
}
