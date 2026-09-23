package com.awr.vip

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.StrictMode
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import org.json.JSONObject

class AwrVipActivity : Activity(), View.OnClickListener {
    private val idKey = 0x0A771001
    private val idActivate = 0x0A771002
    private val idBack = 0x0A771003
    private val idStatus = 0x0A771004

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        StrictMode.setThreadPolicy(StrictMode.ThreadPolicy.Builder().permitAll().build())
        window.statusBarColor = Color.rgb(8, 10, 15)
        window.navigationBarColor = Color.rgb(8, 10, 15)

        val scroll = ScrollView(this)
        scroll.setBackgroundColor(Color.rgb(10, 12, 18))
        val root = LinearLayout(this)
        root.orientation = LinearLayout.VERTICAL
        root.gravity = Gravity.CENTER_HORIZONTAL
        root.setPadding(dp(22), dp(36), dp(22), dp(28))
        scroll.addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        val mark = TextView(this)
        mark.text = "AWR"
        mark.gravity = Gravity.CENTER
        mark.textSize = 15f
        mark.setTextColor(Color.rgb(255, 201, 87))
        mark.background = rounded(Color.rgb(29, 32, 43), dp(18).toFloat(), Color.rgb(255, 201, 87))
        mark.setPadding(dp(18), dp(8), dp(18), dp(8))
        root.addView(mark, lpWrap(dp(8)))

        val title = TextView(this)
        title.text = "AWR VIP"
        title.gravity = Gravity.CENTER
        title.textSize = 32f
        title.setTextColor(Color.WHITE)
        root.addView(title, lpWrap(dp(3)))

        val sub = TextView(this)
        sub.text = "فعّل العضوية للوصول إلى مزايا VIP"
        sub.gravity = Gravity.CENTER
        sub.textSize = 14f
        sub.setTextColor(Color.rgb(160, 166, 180))
        root.addView(sub, lpWrap(dp(24)))

        val status = TextView(this)
        status.id = idStatus
        status.gravity = Gravity.CENTER
        status.textSize = 15f
        status.setPadding(dp(16), dp(13), dp(16), dp(13))
        root.addView(status, lpFull(dp(14)))

        val key = EditText(this)
        key.id = idKey
        key.hint = "أدخل كود AWR VIP"
        key.setSingleLine(true)
        key.textSize = 16f
        key.setTextColor(Color.WHITE)
        key.setHintTextColor(Color.rgb(118, 124, 139))
        key.setPadding(dp(16), dp(14), dp(16), dp(14))
        key.background = rounded(Color.rgb(24, 28, 38), dp(16).toFloat(), Color.rgb(48, 54, 68))
        root.addView(key, lpFull(dp(12)))

        val activate = Button(this)
        activate.id = idActivate
        activate.text = "تفعيل AWR VIP"
        activate.textSize = 16f
        activate.setTextColor(Color.rgb(20, 18, 12))
        activate.background = rounded(Color.rgb(255, 201, 87), dp(16).toFloat(), Color.rgb(255, 201, 87))
        activate.setOnClickListener(this)
        root.addView(activate, lpFull(dp(12), dp(54)))

        val back = Button(this)
        back.id = idBack
        back.text = "رجوع"
        back.textSize = 16f
        back.setTextColor(Color.WHITE)
        back.background = rounded(Color.rgb(31, 35, 47), dp(16).toFloat(), Color.rgb(72, 78, 94))
        back.setOnClickListener(this)
        root.addView(back, lpFull(dp(22), dp(54)))

        val info = TextView(this)
        info.text = "AWR VIP\n\n• المحتوى العادي يعمل بدون تفعيل\n• جودة 1080P والجودات العليا محمية\n• المحتوى والميزات التي تحمل VIP تتطلب التفعيل\n• بعد التفعيل ترجع إلى الشاشة السابقة"
        info.textSize = 14f
        info.setTextColor(Color.rgb(184, 188, 200))
        info.setLineSpacing(0f, 1.25f)
        info.setPadding(dp(18), dp(18), dp(18), dp(18))
        info.background = rounded(Color.rgb(18, 21, 29), dp(18).toFloat(), Color.rgb(39, 44, 57))
        root.addView(info, lpFull(dp(10)))

        setContentView(scroll)
        refreshStatus()
    }

    override fun onClick(v: View?) {
        if (v == null) return
        if (v.id == idActivate) activate() else if (v.id == idBack) finish()
    }

    private fun activate() {
        val keyView = findViewById(idKey) as EditText
        val code = keyView.text.toString().trim()
        if (code != "AWR-2026") {
            setStatus("الكود غير صحيح", false)
            return
        }
        setStatus("جاري التحقق من السيرفر...", false)
        if (verifyServer(code)) {
            val edit = getSharedPreferences("awr_vip_3132", 0).edit()
            edit.putBoolean("active", true)
            edit.putString("code", code)
            edit.apply()
            setStatus("AWR VIP مفعل • دائم", true)
            Handler(Looper.getMainLooper()).postDelayed({ finish() }, 700L)
        } else {
            setStatus("تعذر التفعيل: تحقق من الإنترنت أو الكود", false)
        }
    }

    private fun refreshStatus() {
        val prefs = getSharedPreferences("awr_vip_3132", 0)
        val active = prefs.getBoolean("active", false)
        val saved = prefs.getString("code", "")
        val keyView = findViewById(idKey) as EditText
        if (!saved.isNullOrEmpty()) keyView.setText(saved)
        if (active && saved == "AWR-2026") setStatus("AWR VIP مفعل • دائم", true)
        else setStatus("AWR VIP غير مفعل", false)
    }

    private fun setStatus(text: String, ok: Boolean) {
        val status = findViewById(idStatus) as TextView
        status.text = text
        if (ok) {
            status.setTextColor(Color.rgb(108, 232, 171))
            status.background = rounded(Color.rgb(17, 48, 39), dp(15).toFloat(), Color.rgb(54, 138, 105))
        } else {
            status.setTextColor(Color.rgb(255, 201, 87))
            status.background = rounded(Color.rgb(45, 37, 20), dp(15).toFloat(), Color.rgb(120, 94, 38))
        }
    }

    private fun verifyServer(code: String): Boolean {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("https://awr-license-vercel.vercel.app/api/verify")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            val body = "{\"key\":\"" + code.replace("\\", "\\\\").replace("\"", "\\\"") + "\"}"
            val out = conn.outputStream
            out.write(body.toByteArray(StandardCharsets.UTF_8))
            out.flush()
            out.close()
            val rc = conn.responseCode
            val stream = if (rc in 200..299) conn.inputStream else conn.errorStream
            if (stream == null) return false
            val reader = BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8))
            val sb = StringBuilder()
            var line = reader.readLine()
            while (line != null) {
                sb.append(line)
                line = reader.readLine()
            }
            reader.close()
            val json = JSONObject(sb.toString())
            return json.optBoolean("success", false) &&
                json.optString("code", "") == "VALID" &&
                json.optString("auth", "") == "AWR_OK_2026"
        } catch (_: Throwable) {
            return false
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) { }
        }
    }

    private fun rounded(fill: Int, radius: Float, stroke: Int): GradientDrawable {
        val g = GradientDrawable()
        g.setColor(fill)
        g.cornerRadius = radius
        g.setStroke(dp(1), stroke)
        return g
    }

    private fun lpFull(top: Int, height: Int = LinearLayout.LayoutParams.WRAP_CONTENT): LinearLayout.LayoutParams {
        val p = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height)
        p.setMargins(0, top, 0, 0)
        return p
    }

    private fun lpWrap(top: Int): LinearLayout.LayoutParams {
        val p = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        p.setMargins(0, top, 0, 0)
        return p
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density + 0.5f).toInt()
}
