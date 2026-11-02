package com.exsurveyapp.offline

import android.content.Context
import android.net.Uri
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Base64
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.security.KeyStore
import java.security.MessageDigest
import java.io.ByteArrayOutputStream
import java.io.File
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private class OfflineDatabase(context: Context) : SQLiteOpenHelper(context, "exsurvey_offline.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE offline_records (account_hash TEXT NOT NULL, record_id TEXT NOT NULL, record_type TEXT NOT NULL, payload BLOB NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(account_hash, record_id))")
    db.execSQL("CREATE INDEX idx_offline_records_account_type ON offline_records(account_hash, record_type)")
    db.execSQL("CREATE TABLE offline_metadata (meta_key TEXT PRIMARY KEY, meta_value TEXT NOT NULL)")
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) { }
}

class ExSurveyOfflineStoreModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val db = OfflineDatabase(context)
  override fun getName() = "ExSurveyOfflineStore"
  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("featureEnabled" to com.exsurveyapp.BuildConfig.OFFLINE_INSPECTIONS_ENABLED)
  private val alias = "ExSurveyOfflineInspectionKeyV1"
  private val verifierAlias = "ExSurveyOfflineLoginVerifierKeyV1"
  private val maxBytes = 100L * 1024L * 1024L
  private val maxDocumentBytes = 25L * 1024L * 1024L
  init { reactApplicationContext.cacheDir.listFiles()?.filter { it.name.startsWith("offline-view-") }?.forEach { it.delete() } }

  private fun accountHash(accountId: String): String = MessageDigest.getInstance("SHA-256").digest(accountId.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(alias, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setRandomizedEncryptionRequired(true).setUserAuthenticationRequired(false).build())
    return generator.generateKey()
  }
  private fun verifierKey(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(verifierAlias, null) as? SecretKey)?.let { return it }
    val generator=KeyGenerator.getInstance("HmacSHA256","AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(verifierAlias,KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY).setDigests(KeyProperties.DIGEST_SHA256).build())
    return generator.generateKey()
  }
  private fun passwordVerifier(password:String):ByteArray { val mac=Mac.getInstance("HmacSHA256");mac.init(verifierKey());return mac.doFinal(password.toByteArray(Charsets.UTF_8)) }
  private fun encrypt(plain: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key())
    val iv = cipher.iv; val body = cipher.doFinal(plain); return byteArrayOf(iv.size.toByte()) + iv + body
  }
  private fun decrypt(ciphertext: ByteArray): ByteArray {
    val ivSize = ciphertext[0].toInt() and 0xff
    require(ivSize in 12..16 && ciphertext.size > ivSize + 1) { "Encrypted offline record is malformed." }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, ciphertext, 1, ivSize))
    return cipher.doFinal(ciphertext, ivSize + 1, ciphertext.size - ivSize - 1)
  }
  private fun documentPath(accountHash:String,id:String):File { val name=MessageDigest.getInstance("SHA-256").digest(id.toByteArray(Charsets.UTF_8)).joinToString(""){ "%02x".format(it) };val dir=File(reactApplicationContext.filesDir,"offline-documents/$accountHash");if(!dir.exists())dir.mkdirs();return File(dir,"$name.enc") }
  private fun allDocumentBytes():Long { val root=File(reactApplicationContext.filesDir,"offline-documents");return if(root.exists())root.walkTopDown().filter{it.isFile&&it.extension=="enc"}.sumOf{it.length()}else 0L }
  private fun encryptDocument(accountHash:String,id:String,plain:ByteArray):ByteArray { val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD("$accountHash:$id".toByteArray(Charsets.UTF_8));val iv=cipher.iv;return byteArrayOf(iv.size.toByte())+iv+cipher.doFinal(plain) }
  private fun decryptDocument(accountHash:String,id:String,ciphertext:ByteArray):ByteArray { val ivSize=ciphertext[0].toInt() and 0xff;require(ivSize in 12..16&&ciphertext.size>ivSize+1){"Encrypted document is malformed."};val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,ciphertext,1,ivSize));cipher.updateAAD("$accountHash:$id".toByteArray(Charsets.UTF_8));return cipher.doFinal(ciphertext,ivSize+1,ciphertext.size-ivSize-1) }
  private fun bind(account: String): String {
    require(account.isNotBlank()) { "Account identifier is required." }
    val hash = accountHash(account); val sql = db.writableDatabase
    sql.beginTransaction()
    try {
      // Account-scoped rows remain encrypted and inaccessible through a different account hash.
      // Keeping them prevents a device account switch from destroying an unsynchronized inspection.
      sql.execSQL("INSERT OR REPLACE INTO offline_metadata(meta_key,meta_value) VALUES('active_account',?)", arrayOf(hash))
      sql.setTransactionSuccessful()
    } finally { sql.endTransaction() }
    return hash
  }
  private fun fail(promise: Promise, error: Exception) { promise.reject("E_OFFLINE_STORE", error.message, error) }

  @ReactMethod fun bindAccount(accountId: String, promise: Promise) = try { promise.resolve(bind(accountId)) } catch (e: Exception) { fail(promise, e) }

  @ReactMethod fun setOfflinePassword(accountId:String,password:String,promise:Promise)=try {
    require(password.isNotBlank()) { "Enter the account password to enable offline sign-in." }
    val encoded=Base64.encodeToString(passwordVerifier(password),Base64.NO_WRAP)
    val hash=bind(accountId);val encrypted=encrypt(encoded.toByteArray(Charsets.UTF_8));db.writableDatabase.execSQL("INSERT OR REPLACE INTO offline_records(account_hash,record_id,record_type,payload,updated_at) VALUES(?,?,?,?,?)",arrayOf(hash,"offline-password-verifier","auth",encrypted,System.currentTimeMillis()));promise.resolve(true)
  }catch(e:Exception){fail(promise,e)}

  @ReactMethod fun verifyOfflinePassword(accountId:String,password:String,promise:Promise) {
   try {
    require(password.isNotBlank()) { "Enter your account password." }
    val hash=bind(accountId);val sql=db.writableDatabase;val lockKey="offline_auth_lock_$hash";val failKey="offline_auth_failures_$hash"
    val lockCursor=sql.rawQuery("SELECT meta_value FROM offline_metadata WHERE meta_key=?",arrayOf(lockKey));val lockedUntil=lockCursor.use{if(it.moveToFirst())it.getLong(0)else 0L}
    if(lockedUntil>System.currentTimeMillis()){promise.reject("E_OFFLINE_LOGIN_LOCKED","Too many offline sign-in attempts. Wait five minutes and try again.");return}
    val cursor=sql.rawQuery("SELECT payload FROM offline_records WHERE account_hash=? AND record_id='offline-password-verifier'",arrayOf(hash))
    val stored=cursor.use{if(it.moveToFirst())String(decrypt(it.getBlob(0)),Charsets.UTF_8)else null}
    val valid=stored!=null&&MessageDigest.isEqual(Base64.decode(stored,Base64.NO_WRAP),passwordVerifier(password))
    if(valid){sql.delete("offline_metadata","meta_key=? OR meta_key=?",arrayOf(lockKey,failKey))}
    else {val countCursor=sql.rawQuery("SELECT meta_value FROM offline_metadata WHERE meta_key=?",arrayOf(failKey));val count=countCursor.use{if(it.moveToFirst())it.getInt(0)else 0}+1
      if(count>=5){sql.execSQL("INSERT OR REPLACE INTO offline_metadata(meta_key,meta_value) VALUES(?,?)",arrayOf(lockKey,(System.currentTimeMillis()+5*60*1000).toString()));sql.delete("offline_metadata","meta_key=?",arrayOf(failKey))}
      else sql.execSQL("INSERT OR REPLACE INTO offline_metadata(meta_key,meta_value) VALUES(?,?)",arrayOf(failKey,count.toString()))
    }
    promise.resolve(valid)
   }catch(e:Exception){fail(promise,e)}
  }

  @ReactMethod fun put(accountId: String, id: String, type: String, payload: String, promise: Promise) = try {
    require(id.isNotBlank() && type.isNotBlank()) { "Record ID and type are required." }
    val hash = bind(accountId); val encrypted = encrypt(payload.toByteArray(Charsets.UTF_8)); val sql = db.writableDatabase
    val cursor = sql.rawQuery("SELECT COALESCE(SUM(length(payload)),0) FROM offline_records", null)
    val current = cursor.use { if (it.moveToFirst()) it.getLong(0) else 0L }
    val oldCursor = sql.rawQuery("SELECT COALESCE(length(payload),0) FROM offline_records WHERE account_hash=? AND record_id=?", arrayOf(hash, id))
    val old = oldCursor.use { if (it.moveToFirst()) it.getLong(0) else 0L }
    if (current - old + encrypted.size + allDocumentBytes() > maxBytes) throw IllegalStateException("OFFLINE_STORAGE_FULL")
    sql.execSQL("INSERT OR REPLACE INTO offline_records(account_hash,record_id,record_type,payload,updated_at) VALUES(?,?,?,?,?)", arrayOf(hash, id, type, encrypted, System.currentTimeMillis()))
    promise.resolve(true)
  } catch (e: Exception) { fail(promise, e) }

  @ReactMethod fun storePhoto(accountId: String, id: String, uri: String, mimeType: String, fileName: String, activityId: String, checkpointResponseId: String?, promise: Promise) = try {
    require(mimeType in listOf("image/jpeg","image/png","image/webp")) { "Unsupported image type." }
    val source=Uri.parse(uri);val input=reactApplicationContext.contentResolver.openInputStream(source) ?: throw IllegalArgumentException("Selected image is no longer available.")
    val output=ByteArrayOutputStream();input.use { stream -> val buffer=ByteArray(8192);var total=0;while(true){val count=stream.read(buffer);if(count<0)break;total+=count;if(total>10*1024*1024)throw IllegalArgumentException("Photo exceeds the 10 MB offline limit.");output.write(buffer,0,count)} }
    val encoded=Base64.encodeToString(output.toByteArray(),Base64.NO_WRAP)
    val record=org.json.JSONObject().put("base64",encoded).put("mimeType",mimeType).put("fileName",fileName).put("activityId",activityId).put("checkpointResponseId",checkpointResponseId).put("syncStatus","Pending").toString()
    val account=bind(accountId);val encrypted=encrypt(record.toByteArray(Charsets.UTF_8));val sql=db.writableDatabase
    val currentCursor=sql.rawQuery("SELECT COALESCE(SUM(length(payload)),0) FROM offline_records",null);val current=currentCursor.use{if(it.moveToFirst())it.getLong(0)else 0L}
    if(current+encrypted.size+allDocumentBytes()>maxBytes)throw IllegalStateException("OFFLINE_STORAGE_FULL")
    sql.execSQL("INSERT OR REPLACE INTO offline_records(account_hash,record_id,record_type,payload,updated_at) VALUES(?,?,?,?,?)",arrayOf(account,id,"photo",encrypted,System.currentTimeMillis()));promise.resolve(true)
  } catch(e:Exception){fail(promise,e)}

  @ReactMethod fun exportPhoto(accountId: String, id: String, promise: Promise) = try {
    val hash=bind(accountId);val cursor=db.readableDatabase.rawQuery("SELECT payload FROM offline_records WHERE account_hash=? AND record_id=? AND record_type='photo'",arrayOf(hash,id))
    val json=cursor.use{if(it.moveToFirst())org.json.JSONObject(String(decrypt(it.getBlob(0)),Charsets.UTF_8))else null} ?: throw IllegalArgumentException("Offline photograph not found.")
    val bytes=Base64.decode(json.getString("base64"),Base64.NO_WRAP);val cache=File(reactApplicationContext.cacheDir,"offline-photo-${id.replace(Regex("[^a-zA-Z0-9-]"),"")}.${when(json.getString("mimeType")){"image/png"->"png";"image/webp"->"webp";else->"jpg"}}");cache.writeBytes(bytes);promise.resolve("file://${cache.absolutePath}")
  }catch(e:Exception){fail(promise,e)}

  @ReactMethod fun deleteExportedPhoto(path:String,promise:Promise)=try{val file=File(Uri.parse(path).path ?: path);promise.resolve(!file.exists()||file.delete())}catch(e:Exception){fail(promise,e)}

  @ReactMethod fun storeDocument(accountId:String,id:String,base64:String,expectedSha256:String,mimeType:String,fileName:String,promise:Promise)=try {
    require(id.isNotBlank()&&fileName.isNotBlank()){"Document identity and filename are required."};require(mimeType in listOf("application/pdf","image/jpeg","image/png","image/webp")){"Only PDF and common image documents are supported."}
    val bytes=Base64.decode(base64,Base64.DEFAULT);require(bytes.isNotEmpty()&&bytes.size<=maxDocumentBytes){"Document is empty or exceeds the 25 MB offline limit."}
    val signatureOk=when(mimeType){"application/pdf"->bytes.size>=5&&bytes.copyOfRange(0,5).contentEquals("%PDF-".toByteArray());"image/png"->bytes.size>=8&&bytes.copyOfRange(0,8).contentEquals(byteArrayOf(0x89.toByte(),0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a));"image/webp"->bytes.size>=12&&String(bytes,0,4)=="RIFF"&&String(bytes,8,4)=="WEBP";else->bytes.size>=3&&bytes[0]==0xff.toByte()&&bytes[1]==0xd8.toByte()&&bytes[2]==0xff.toByte()};require(signatureOk){"Document content does not match its declared PDF/image type."}
    val actual=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){ "%02X".format(it) };require(actual.equals(expectedSha256.replace(":", ""),true)){"Document integrity verification failed."}
    val hash=bind(accountId);val target=documentPath(hash,id);val already=if(target.isFile)runCatching{val old=decryptDocument(hash,id,target.readBytes());MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(old),MessageDigest.getInstance("SHA-256").digest(bytes))}.getOrDefault(false)else false
    if(!already){val dbCursor=db.readableDatabase.rawQuery("SELECT COALESCE(SUM(length(payload)),0) FROM offline_records",null);val dbBytes=dbCursor.use{if(it.moveToFirst())it.getLong(0)else 0L};val dir=target.parentFile!!;val oldSize=if(target.isFile)target.length()else 0L;val encryptedSize=bytes.size+29L;require(dbBytes+allDocumentBytes()-oldSize+encryptedSize<=maxBytes){"OFFLINE_STORAGE_FULL"};val available=dir.usableSpace;require(available>=encryptedSize*2){"OFFLINE_STORAGE_FULL"}
      val temp=File(dir,"${target.name}.tmp");temp.writeBytes(encryptDocument(hash,id,bytes));if(target.exists()&&!target.delete()){temp.delete();throw IllegalStateException("Could not safely replace a corrupt local document.")};if(!temp.renameTo(target)){temp.delete();throw IllegalStateException("Could not safely commit the downloaded document.")}}
    promise.resolve(true)
  }catch(e:Exception){fail(promise,e)}

  @ReactMethod fun exportDocument(accountId:String,id:String,expectedSha256:String,mimeType:String,promise:Promise)=try {
    val hash=bind(accountId);val source=documentPath(hash,id);require(source.isFile){"Offline document is not downloaded."};val bytes=decryptDocument(hash,id,source.readBytes());val actual=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){ "%02X".format(it) };require(actual.equals(expectedSha256.replace(":", ""),true)){"Stored document integrity verification failed."}
    val safe=MessageDigest.getInstance("SHA-256").digest(id.toByteArray(Charsets.UTF_8)).take(8).joinToString(""){ "%02x".format(it) };val extension=when(mimeType){"application/pdf"->"pdf";"image/png"->"png";"image/webp"->"webp";else->"jpg"};val temp=File(reactApplicationContext.cacheDir,"offline-view-$safe.$extension");temp.writeBytes(bytes);promise.resolve("file://${temp.absolutePath}")
  }catch(e:Exception){fail(promise,e)}

  @ReactMethod fun deleteDocument(accountId:String,id:String,promise:Promise)=try{val hash=bind(accountId);val file=documentPath(hash,id);promise.resolve(!file.exists()||file.delete())}catch(e:Exception){fail(promise,e)}
  @ReactMethod fun deleteExportedDocument(path:String,promise:Promise)=try{val file=File(Uri.parse(path).path?:path);val cache=reactApplicationContext.cacheDir.canonicalPath;promise.resolve(file.canonicalPath.startsWith(cache+File.separator)&&(!file.exists()||file.delete()))}catch(e:Exception){fail(promise,e)}

  @ReactMethod fun get(accountId: String, id: String, promise: Promise) = try {
    val hash = bind(accountId); val cursor = db.readableDatabase.rawQuery("SELECT payload FROM offline_records WHERE account_hash=? AND record_id=?", arrayOf(hash, id))
    val value = cursor.use { if (it.moveToFirst()) String(decrypt(it.getBlob(0)), Charsets.UTF_8) else null }
    promise.resolve(value)
  } catch (e: Exception) { fail(promise, e) }

  @ReactMethod fun list(accountId: String, type: String?, promise: Promise) = try {
    val hash = bind(accountId); val sql = if (type.isNullOrBlank()) "SELECT record_id,record_type,payload,updated_at FROM offline_records WHERE account_hash=? ORDER BY updated_at" else "SELECT record_id,record_type,payload,updated_at FROM offline_records WHERE account_hash=? AND record_type=? ORDER BY updated_at"
    val cursor = db.readableDatabase.rawQuery(sql, if (type.isNullOrBlank()) arrayOf(hash) else arrayOf(hash, type)); val result: WritableArray = Arguments.createArray()
    cursor.use { while (it.moveToNext()) { val row = Arguments.createMap(); row.putString("id", it.getString(0)); row.putString("type", it.getString(1)); row.putString("payload", String(decrypt(it.getBlob(2)), Charsets.UTF_8)); row.putDouble("updatedAt", it.getLong(3).toDouble()); result.pushMap(row) } }
    promise.resolve(result)
  } catch (e: Exception) { fail(promise, e) }

  @ReactMethod fun remove(accountId: String, id: String, promise: Promise) = try { val hash=bind(accountId); promise.resolve(db.writableDatabase.delete("offline_records", "account_hash=? AND record_id=?", arrayOf(hash,id))>0) } catch (e: Exception) { fail(promise,e) }
  @ReactMethod fun clearAccount(accountId: String, promise: Promise) = try { val hash=bind(accountId); promise.resolve(db.writableDatabase.delete("offline_records", "account_hash=?", arrayOf(hash))) } catch (e: Exception) { fail(promise,e) }
  @ReactMethod fun stats(accountId: String, promise: Promise) = try {
    val hash=bind(accountId); val cursor=db.readableDatabase.rawQuery("SELECT COALESCE(SUM(length(payload)),0),COUNT(*) FROM offline_records WHERE account_hash=?",arrayOf(hash));val docDir=File(reactApplicationContext.filesDir,"offline-documents/$hash");val documentBytes=if(docDir.exists())docDir.walkTopDown().filter{it.isFile&&it.extension=="enc"}.sumOf{it.length()}else 0L
    val result=Arguments.createMap();cursor.use { if(it.moveToFirst()){result.putDouble("bytesUsed",(it.getLong(0)+documentBytes).toDouble());result.putInt("recordCount",it.getInt(1)+(if(docDir.exists())docDir.walkTopDown().count{file->file.isFile&&file.extension=="enc"}else 0))} };result.putDouble("maxBytes",maxBytes.toDouble());promise.resolve(result)
  } catch(e:Exception){fail(promise,e)}
}
