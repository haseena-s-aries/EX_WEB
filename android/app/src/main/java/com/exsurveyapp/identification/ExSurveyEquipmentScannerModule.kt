package com.exsurveyapp.identification

import android.app.Activity
import android.graphics.BitmapFactory
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.NotFoundException
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer

class ExSurveyEquipmentScannerModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var adapter: NfcAdapter? = null
  private var scanActivity: Activity? = null
  private var scanPromise: Promise? = null
  private val handler = Handler(Looper.getMainLooper())
  private val timeout = Runnable { finishNfc(error = "NFC scan timed out. Tap Scan NFC and hold the tag near the device again.") }

  override fun getName() = "ExSurveyEquipmentScanner"
  override fun getConstants() = mapOf("nfcSupported" to (NfcAdapter.getDefaultAdapter(reactApplicationContext) != null))

  @ReactMethod fun startNfcScan(promise: Promise) {
    val activity = currentActivity
    val nfc = NfcAdapter.getDefaultAdapter(reactApplicationContext)
    if (activity == null || nfc == null || !nfc.isEnabled) {
      promise.reject("E_NFC_UNAVAILABLE", "This device has no enabled NFC reader.")
      return
    }
    if (scanPromise != null) finishNfc(error = "NFC scan was restarted.")
    scanActivity = activity
    scanPromise = promise
    handler.postDelayed(timeout, 30_000)
    try {
      adapter = nfc
      nfc.enableReaderMode(activity, { tag: Tag ->
        val uid = tag.id.joinToString("") { byte -> "%02X".format(byte) }
        finishNfc(uid = uid, technology = "NFC")
      }, NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_NFC_V or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)
    } catch (error: Exception) {
      finishNfc(error = error.message ?: "Could not start NFC reading.")
    }
  }

  @ReactMethod fun stopNfcScan(promise: Promise) {
    finishNfc(error = "NFC scan cancelled.")
    promise.resolve(true)
  }

  private fun finishNfc(uid: String? = null, technology: String? = null, error: String? = null) {
    handler.removeCallbacks(timeout)
    val nfc = adapter
    val activity = scanActivity
    adapter = null
    scanActivity = null
    val promise = scanPromise
    scanPromise = null
    if (nfc != null && activity != null) activity.runOnUiThread { try { nfc.disableReaderMode(activity) } catch (_: Exception) { } }
    if (uid != null && promise != null) {
      val result = Arguments.createMap(); result.putString("identifier", uid); result.putString("technology", technology ?: "NFC"); promise.resolve(result)
    } else if (error != null && promise != null) promise.reject("E_NFC_SCAN", error)
  }

  @ReactMethod fun decodeQrCode(imageUri: String, promise: Promise) {
    try {
      val uri = Uri.parse(imageUri)
      val options = BitmapFactory.Options().apply { inSampleSize = 4 }
      val bitmap = reactApplicationContext.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
        ?: throw IllegalArgumentException("The camera image could not be opened.")
      val pixels = IntArray(bitmap.width * bitmap.height)
      val width = bitmap.width
      val height = bitmap.height
      bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
      bitmap.recycle()
      val source = RGBLuminanceSource(width, height, pixels)
      val hints = mapOf(DecodeHintType.POSSIBLE_FORMATS to listOf(com.google.zxing.BarcodeFormat.QR_CODE), DecodeHintType.TRY_HARDER to true)
      val result = MultiFormatReader().decode(BinaryBitmap(HybridBinarizer(source)), hints)
      val map = Arguments.createMap(); map.putString("identifier", result.text); map.putString("technology", "QR"); promise.resolve(map)
    } catch (_: NotFoundException) { promise.reject("E_QR_NOT_FOUND", "No readable QR code was found in that camera image.") }
    catch (error: Exception) { promise.reject("E_QR_SCAN", error.message ?: "Could not read the QR code.", error) }
  }
}
