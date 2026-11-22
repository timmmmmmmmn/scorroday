package nl.timvanbergen.scorroday

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Inloggen bij SOMtoday zelf: school kiezen en inloggen zoals altijd (ook via Microsoft of Entree).
 * Aan het eind stuurt SOMtoday je naar somtoday://…; die link vangen we hier af.
 */
class Inloggen : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var laden: ProgressBar
    private var bezig = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val density = resources.displayMetrics.density
        val navy = getColor(R.color.launcher_bg)

        val kop = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(navy)
        }
        val sluit = TextView(this).apply {
            text = "✕"
            textSize = 20f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setOnClickListener { finish() }
        }
        kop.addView(sluit, LinearLayout.LayoutParams((52 * density).toInt(), (52 * density).toInt()))
        kop.addView(TextView(this).apply {
            text = "Inloggen via SOMtoday"
            textSize = 17f
            setTextColor(Color.WHITE)
        })

        web = WebView(this)
        laden = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
        }
        val vak = FrameLayout(this)
        vak.addView(web, FrameLayout.LayoutParams(-1, -1))
        vak.addView(laden, FrameLayout.LayoutParams(-1, (4 * density).toInt()))

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(kop, LinearLayout.LayoutParams(-1, -2))
        root.addView(vak, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val sys = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            kop.setPadding(0, sys.top, 0, 0)
            v.setPadding(sys.left, 0, sys.right, sys.bottom)
            WindowInsetsCompat.CONSUMED
        }
        WindowCompat.getInsetsController(window, root).isAppearanceLightStatusBars = false

        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Sommige scholen loggen in via Google, en Google weigert ingebouwde browsers; daarom zonder "wv".
            userAgentString = userAgentString.replace("; wv", "").replace(Regex(" Version/[\\d.]+"), "")
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, p: Int) {
                laden.visibility = if (p < 100) View.VISIBLE else View.GONE
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = vang(request.url)

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = vang(Uri.parse(url))
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })

        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(Som.startUrl(this))
    }

    private fun vang(url: Uri): Boolean {
        if (url.scheme != "somtoday") return false
        if (bezig) return true
        bezig = true
        laden.visibility = View.VISIBLE
        Thread {
            val fout = try {
                Som.klaarMetInloggen(this, url)
                null
            } catch (e: Exception) {
                e.message ?: "Inloggen mislukt"
            }
            runOnUiThread {
                setResult(Activity.RESULT_OK, Intent().putExtra("fout", fout))
                finish()
            }
        }.start()
        return true
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
