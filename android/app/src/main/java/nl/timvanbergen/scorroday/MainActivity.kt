package nl.timvanbergen.scorroday

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import nl.timvanbergen.scorroday.glass.GlassBar
import nl.timvanbergen.scorroday.glass.GlassMenu
import nl.timvanbergen.scorroday.glass.records.GlassMenuItemRecord
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Scorroday als app. De pagina's zitten in de app zelf (assets/www) en worden onder een eigen https-adres
 * getoond. Gegevens komen rechtstreeks van SOMtoday, via de brug hieronder (window.ScorroNative.api),
 * zodat de tokens nooit in de pagina of op een server staan.
 * De navigatiebalk en de menu's zijn glas van de app zelf (Android 13+), de rest van de pagina blijft plat.
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var bars: WindowInsetsControllerCompat
    private var glassMenu: GlassMenu? = null
    @Volatile private var insetTop = 0f
    @Volatile private var insetBottom = 0f
    private val net = Executors.newFixedThreadPool(4)

    // Een melding die op een tabblad moet openen wacht tot de pagina klaar is.
    private var pending: String? = null
    private var pageReady = false

    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    private val inloggen = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val fout = r.data?.getStringExtra("fout")
        val gelukt = Som.ingelogd(this)
        if (gelukt) {
            Meldingen.plan(this)
            vraagMeldingen()
        }
        val arg = if (gelukt) "null" else JSONObject.quote(fout ?: "")
        web.evaluateJavascript("window.scorroIngelogd && scorroIngelogd($arg)", null)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Tekenen tot onder status- en navigatiebalk; de pagina houdt zelf die ruimte vrij.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        @Suppress("DEPRECATION")
        window.statusBarColor = Color.TRANSPARENT
        @Suppress("DEPRECATION")
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
            @Suppress("DEPRECATION")
            window.isStatusBarContrastEnforced = false
        }

        val root = FrameLayout(this)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            glassMenu = GlassMenu(window.decorView as ViewGroup)
        }

        val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        bars = WindowCompat.getInsetsController(window, root)
        setDarkBars(night)

        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val sys = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            val density = resources.displayMetrics.density
            view.setPadding(sys.left, 0, sys.right, ime.bottom)
            insetTop = sys.top / density
            insetBottom = if (ime.bottom > 0) 0f else sys.bottom / density
            pushInsets()
            WindowInsetsCompat.CONSUMED
        }

        web.setBackgroundColor(getColor(R.color.page_bg))
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setSupportZoom(false)
            builtInZoomControls = false
            userAgentString = "$userAgentString ScorrodayApp/${Updater.currentName(this@MainActivity)}"
        }
        web.addJavascriptInterface(Bridge(), "ScorroNative")
        web.webChromeClient = WebChromeClient()
        web.webViewClient = Client()

        // Terug-knop: eerst menu, paneel of detail sluiten, anders de app wegzetten.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.scorroBack ? window.scorroBack() : false") { handled ->
                    if (handled != "true") moveTaskToBack(true)
                }
            }
        })

        Meldingen.kanalen(this)
        if (Som.ingelogd(this)) Meldingen.plan(this)
        handle(intent)
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(HOME)
        Updater.checkQuietly(this)
    }

    /** Getikt op een melding: naar het goede tabblad. */
    private fun handle(intent: Intent?) {
        val tab = intent?.getStringExtra(Meldingen.EXTRA_TAB) ?: return
        pending = "window.scorroTab && scorroTab(${JSONObject.quote(tab)})"
        runPending()
    }

    private fun runPending() {
        val js = pending ?: return
        if (!pageReady) return
        web.evaluateJavascript(js) { done -> if (done == "true") pending = null }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    private fun vraagMeldingen() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun setDarkBars(dark: Boolean) {
        bars.isAppearanceLightStatusBars = !dark
        bars.isAppearanceLightNavigationBars = !dark
    }

    private fun pushInsets() {
        web.evaluateJavascript(
            "(function(r){r.setProperty('--sat','${insetTop}px');r.setProperty('--sab','${insetBottom}px');})(document.documentElement.style);" +
                "window.dispatchEvent(new Event('resize'))",
            null
        )
    }

    private fun windowRect(box: JSONObject): RectF {
        val density = resources.displayMetrics.density
        val origin = IntArray(2).also { web.getLocationInWindow(it) }
        val left = origin[0] + box.getDouble("x").toFloat() * density
        val top = origin[1] + box.getDouble("y").toFloat() * density
        return RectF(left, top, left + box.getDouble("w").toFloat() * density, top + box.getDouble("h").toFloat() * density)
    }

    /** Opent het glazen menu vanuit een knop in de pagina (positie in CSS-pixels). */
    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private fun showGlassMenu(menu: JSONObject) {
        val rows = menu.getJSONArray("items")
        val items = List(rows.length()) { i ->
            val row = rows.getJSONObject(i)
            GlassMenuItemRecord(
                id = row.optString("id"),
                title = row.optString("title"),
                subtitle = row.optString("subtitle").ifEmpty { null },
                icon = row.optString("icon").ifEmpty { null },
                checked = if (row.has("checked")) row.optBoolean("checked") else null,
                destructive = row.optBoolean("destructive"),
                disabled = row.optBoolean("disabled"),
                separator = row.optBoolean("separator"),
                heading = row.optBoolean("heading"),
            )
        }
        glassMenu?.show(windowRect(menu), items, menu.optBoolean("dark")) { id ->
            web.evaluateJavascript("window.scorroGlassPick && scorroGlassPick(${JSONObject.quote(id)})", null)
        }
    }

    /** De zwevende glazen navigatie; de pagina meet zelf waar die hoort te staan. */
    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private fun showGlassBar(bar: JSONObject) {
        val tabs = bar.getJSONArray("tabs")
        glassMenu?.setBar(
            windowRect(bar.getJSONObject("pill")),
            windowRect(bar.getJSONObject("add")),
            List(tabs.length()) { i ->
                val tab = tabs.getJSONObject(i)
                GlassBar.Tab(tab.getString("id"), tab.getString("title"), tab.getString("icon"))
            },
            bar.getString("active"),
            bar.optBoolean("dark"),
            bar.optBoolean("visible", true),
        ) { id ->
            web.evaluateJavascript("window.scorroGlassNav && scorroGlassNav(${JSONObject.quote(id)})", null)
        }
    }

    /** Update is gedownload: zeggen dat hij erin gaat zodra je de app wegzet. */
    fun updateReady(name: String) {
        web.evaluateJavascript(
            "window.scorroToast && scorroToast(${JSONObject.quote("Versie $name staat klaar en wordt geïnstalleerd zodra je de app sluit")})",
            null
        )
    }

    private fun onOurSite(): Boolean = web.url?.let { Uri.parse(it).host == HOST } ?: false

    override fun onResume() {
        super.onResume()
        inFront = true
        Updater.resume(this)
        Updater.checkQuietly(this)
    }

    override fun onPause() {
        super.onPause()
        inFront = false
    }

    override fun onStop() {
        super.onStop()
        // Pas installeren als de app weg is: dan wordt niemand onderbroken.
        Updater.installIfReady(this)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onDestroy() {
        net.shutdown()
        web.destroy()
        super.onDestroy()
    }

    /** Wat de pagina van de app mag vragen. */
    private inner class Bridge {

        @JavascriptInterface
        fun insets(): String = "$insetTop,$insetBottom"

        @JavascriptInterface
        fun setDark(dark: Boolean) {
            runOnUiThread { if (onOurSite()) setDarkBars(dark) }
        }

        @JavascriptInterface
        fun haptic(kind: String) {
            runOnUiThread {
                if (!onOurSite()) return@runOnUiThread
                val effect = when {
                    kind == "confirm" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> HapticFeedbackConstants.CONFIRM
                    kind == "reject" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> HapticFeedbackConstants.REJECT
                    kind == "long" -> HapticFeedbackConstants.LONG_PRESS
                    else -> HapticFeedbackConstants.CLOCK_TICK
                }
                web.performHapticFeedback(effect)
            }
        }

        /** Of de glazen navigatie en menu's kunnen (Android 13+). */
        @JavascriptInterface
        fun glassUi(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

        /** Geeft false terug als het hier niet kan; de pagina toont dan haar eigen menu. */
        @JavascriptInterface
        fun glassMenu(json: String): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
            val menu = JSONObject(json)
            runOnUiThread { if (onOurSite()) showGlassMenu(menu) }
            return true
        }

        @JavascriptInterface
        fun glassBar(json: String) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
            val bar = JSONObject(json)
            runOnUiThread { if (onOurSite()) showGlassBar(bar) }
        }

        @JavascriptInterface
        fun ingelogd(): Boolean = Som.ingelogd(this@MainActivity)

        @JavascriptInterface
        fun school(): String = Som.school(this@MainActivity)

        @JavascriptInterface
        fun login() {
            runOnUiThread { inloggen.launch(Intent(this@MainActivity, Inloggen::class.java)) }
        }

        @JavascriptInterface
        fun logout() {
            Som.uitloggen(this@MainActivity)
            Meldingen.stop(this@MainActivity)
        }

        /** Een verzoek aan SOMtoday; het antwoord komt terug via scorroAntw(id, status, range, body). */
        @JavascriptInterface
        fun api(id: Int, methode: String, pad: String, accept: String?, range: String?, body: String?) {
            net.execute {
                val js = try {
                    val a = Som.vraag(this@MainActivity, methode, pad, accept?.ifEmpty { null }, range?.ifEmpty { null }, body?.ifEmpty { null })
                    "scorroAntw($id,${a.status},${JSONObject.quote(a.range ?: "")},${JSONObject.quote(a.body)})"
                } catch (e: Som.Fout) {
                    "scorroAntw($id,${if (e.status == 401) 401 else 0},'',${JSONObject.quote(JSONObject().put("fout", e.message).toString())})"
                } catch (e: Exception) {
                    "scorroAntw($id,0,'',${JSONObject.quote(JSONObject().put("fout", e.message ?: "Fout").toString())})"
                }
                runOnUiThread { web.evaluateJavascript(js, null) }
            }
        }

        @JavascriptInterface
        fun meldingen(): String = Meldingen.instellingen(this@MainActivity).toString()

        @JavascriptInterface
        fun setMeldingen(json: String) {
            Meldingen.zet(this@MainActivity, json)
            runOnUiThread { vraagMeldingen() }
        }

        /** Of Android meldingen van Scorroday toelaat. */
        @JavascriptInterface
        fun meldingenMogen(): Boolean =
            Build.VERSION.SDK_INT < 33 || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

        @JavascriptInterface
        fun meldingenInstellingen() {
            runOnUiThread {
                startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, packageName))
            }
        }

        @JavascriptInterface
        fun controleerNu() = Meldingen.nu(this@MainActivity)

        /** De pagina is klaar: wachtende acties uitvoeren, en melden als de app net is bijgewerkt. */
        @JavascriptInterface
        fun ready() {
            runOnUiThread {
                pageReady = true
                runPending()
                Updater.justUpdated(this@MainActivity)?.let { name ->
                    web.evaluateJavascript("window.scorroToast && scorroToast(${JSONObject.quote("Bijgewerkt naar versie $name")})", null)
                }
            }
        }

        @JavascriptInterface
        fun share(title: String, text: String) {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, title)
                .putExtra(Intent.EXTRA_TEXT, text)
            runOnUiThread { startActivity(Intent.createChooser(send, "Delen")) }
        }

        @JavascriptInterface
        fun openUrl(url: String) {
            val u = Uri.parse(url)
            if (u.scheme != "https" && u.scheme != "http" && u.scheme != "webcal") return
            runOnUiThread { runCatching { startActivity(Intent(Intent.ACTION_VIEW, u)) } }
        }

        @JavascriptInterface
        fun appVersion(): String = Updater.currentName(this@MainActivity)

        @JavascriptInterface
        fun checkForUpdate() {
            runOnUiThread { if (onOurSite()) Updater.check(this@MainActivity, manual = true) }
        }
    }

    private inner class Client : WebViewClient() {

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val url = request.url
            if (url.host != HOST || request.method != "GET") return null
            val path = url.path ?: "/"
            return Bundel.serve(this@MainActivity, if (path == "/" || path.isEmpty()) "/index.html" else path, null)
                ?: WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), java.io.ByteArrayInputStream(ByteArray(0)))
        }

        // Links naar andere sites openen in de browser.
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == HOST) return false
            try {
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
            } catch (_: ActivityNotFoundException) {
            }
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
            pageReady = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) glassMenu?.hideBar()
        }

        override fun onPageCommitVisible(view: WebView, url: String?) = pushInsets()

        override fun onPageFinished(view: WebView, url: String?) = pushInsets()
    }

    companion object {
        // Bestaat niet echt op internet: alles onder dit adres komt uit de app zelf.
        private const val HOST = "app.scorroday.timvanbergen.nl"
        private const val HOME = "https://$HOST/"
        @Volatile var inFront = false
    }
}
