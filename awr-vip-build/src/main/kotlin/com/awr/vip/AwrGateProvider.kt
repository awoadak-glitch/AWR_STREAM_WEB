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
    private val protectedViews = WeakHashMap<View, Boolean>()
    private var lastGateAt = 0L

    override fun onCreate(): Boolean {
        val app = context?.applicationContext as? Application ?: return true
        app.registerActivityLifecycleCallbacks(this)
        handler.post(scanner)
        return true
    }

    private val scanner = object : Runnable {
        override fun run() {
            try {
                val activity = current.get()
                if (activity != null && !activity.isFinishing && activity !is AwrVipActivity) {
                    val active = isActive(activity)
                    val className = activity.javaClass.name.lowercase()
                    if (!active && (className.contains("module_vip") || className.contains("viprights") || className.endsWith("vipactivity"))) {
                        openGate(activity)
                        activity.finish()
                    } else {
                        scan(activity.window.decorView, activity, active)
                    }
                }
            } catch (_: Throwable) {
            }
            handler.postDelayed(this, 450L)
        }
    }

    private fun isActive(activity: Activity): Boolean {
        val p = activity.getSharedPreferences("awr_vip_3132", 0)
        return p.getBoolean("active", false) && p.getString("code", "") == "AWR-2026"
    }

    private fun scan(v: View, activity: Activity, active: Boolean) {
        try {
            if (v is TextView) {
                val t = v.text?.toString()?.trim()?.uppercase() ?: ""
                val premium = t == "1080P" || t.contains("VIP") || t.contains("PREMIUM") || t.contains("عضوية VIP")
                if (premium) {
                    if (!active) protect(v, activity) else unprotect(v)
                }
            }
            if (v is ViewGroup) {
                for (i in 0 until v.childCount) scan(v.getChildAt(i), activity, active)
            }
        } catch (_: Throwable) {
        }
    }

    private fun protect(v: View, activity: Activity) {
        if (protectedViews.containsKey(v)) return
        protectedViews[v] = true
        v.alpha = 0.62f
        v.setOnTouchListener { _, ev ->
            if (ev.action == MotionEvent.ACTION_UP) openGate(activity)
            true
        }
    }

    private fun unprotect(v: View) {
        if (!protectedViews.containsKey(v)) return
        protectedViews.remove(v)
        v.alpha = 1f
        v.setOnTouchListener(null)
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
