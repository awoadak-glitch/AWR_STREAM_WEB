package com.awr.vip

import android.app.Activity
import android.app.Application
import android.content.ContentProvider
import android.content.ContentValues
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import java.lang.ref.WeakReference
import java.util.WeakHashMap

class AwrGateProvider : ContentProvider(), Application.ActivityLifecycleCallbacks {
    private val handler = Handler(Looper.getMainLooper())
    private var current = WeakReference<Activity>(null)
    private val protectedTargets = WeakHashMap<View, Boolean>()
    private var lastGateAt = 0L

    override fun onCreate(): Boolean {
        try {
            val app = context?.applicationContext as? Application ?: return true
            app.registerActivityLifecycleCallbacks(this)
            handler.post(scanner)
        } catch (_: Throwable) {
        }
        return true
    }

    private val scanner = object : Runnable {
        override fun run() {
            try {
                val activity = current.get()
                if (activity != null && !activity.isFinishing && activity !is AwrVipActivity) {
                    val active = isActive(activity)
                    val className = activity.javaClass.name.lowercase()
                    if (!active && isVipScreen(className)) {
                        openGate(activity)
                    } else {
                        scan(activity.window.decorView, activity, active)
                    }
                }
            } catch (_: Throwable) {
            }
            handler.postDelayed(this, 350L)
        }
    }

    private fun isVipScreen(className: String): Boolean {
        return className.contains("module_vip") ||
            className.contains("viprights") ||
            className.endsWith("vipactivity") ||
            className.contains("redemptionvip")
    }

    private fun isActive(activity: Activity): Boolean {
        val p = activity.getSharedPreferences("awr_vip_3132", 0)
        return p.getBoolean("active", false) && p.getString("code", "") == "AWR-2026"
    }

    private fun scan(v: View, activity: Activity, active: Boolean) {
        try {
            if (v is TextView) {
                val raw = v.text?.toString()?.trim() ?: ""
                val t = raw.uppercase()
                if (isPremiumLabel(t)) {
                    val target = findActionTarget(v)
                    if (active) unprotect(target) else protect(target, activity)
                }
            }
            if (v is ViewGroup) {
                for (i in 0 until v.childCount) scan(v.getChildAt(i), activity, active)
            }
        } catch (_: Throwable) {
        }
    }

    private fun isPremiumLabel(t: String): Boolean {
        if (t.isEmpty()) return false
        if (t == "VIP" || t == "1080P" || t == "1080P+" || t == "FHD" ||
            t == "2K" || t == "4K" || t == "1440P" || t == "2160P" ||
            t.contains("ULTRA HD") || t.contains("PREMIUM")) return true
        if (t.contains("VIP") && t.length <= 32) return true
        return false
    }

    private fun findActionTarget(label: View): View {
        var cur: View = label
        var depth = 0
        while (depth < 7) {
            if (cur.isClickable || cur.isLongClickable || cur.isFocusable) return cur
            val p = cur.parent
            if (p !is View) break
            cur = p
            depth++
        }
        return cur
    }

    private fun protect(target: View, activity: Activity) {
        if (protectedTargets.containsKey(target)) return
        protectedTargets[target] = true
        target.setOnTouchListener { _, ev ->
            if (isActive(activity)) {
                false
            } else {
                if (ev.action == MotionEvent.ACTION_UP) openGate(activity)
                true
            }
        }
    }

    private fun unprotect(target: View) {
        if (!protectedTargets.containsKey(target)) return
        protectedTargets.remove(target)
        target.setOnTouchListener(null)
    }

    private fun openGate(activity: Activity) {
        val now = System.currentTimeMillis()
        if (now - lastGateAt < 900L) return
        lastGateAt = now
        try {
            val i = Intent(activity, AwrVipActivity::class.java)
            i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            activity.startActivity(i)
        } catch (_: Throwable) {
        }
    }

    override fun onActivityResumed(activity: Activity) { current = WeakReference(activity) }
    override fun onActivityPaused(activity: Activity) { if (current.get() === activity) current.clear() }
    override fun onActivityDestroyed(activity: Activity) { if (current.get() === activity) current.clear() }
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}

    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? = null
    override fun getType(uri: Uri): String? = null
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
