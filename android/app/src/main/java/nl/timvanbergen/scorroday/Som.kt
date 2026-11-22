package nl.timvanbergen.scorroday

import android.content.Context
import android.net.Uri
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * De koppeling met SOMtoday. Inloggen gaat zoals in de officiële leerling-app (OAuth met PKCE);
 * de tokens blijven op de telefoon, er zit geen eigen server tussen.
 * Gebruikt door de pagina (via de brug in MainActivity) en door de meldingen op de achtergrond.
 */
object Som {
    private const val KLANT = "somtoday-leerling-native"
    const val TERUG = "somtoday://nl.topicus.somtoday.leerling/oauth/callback"
    private const val INLOG = "https://inloggen.somtoday.nl"
    private const val CLAIMS =
        """{"id_token":{"given_name":null,"leerlingen":null,"orgname":null,"affiliation":{"values":["student","parent/guardian"]}}}"""
    private const val PREFS = "som"

    class Antwoord(val status: Int, val body: String, val range: String?)
    class Fout(message: String, val status: Int = 0) : Exception(message)

    private val slot = Any()

    // ---------- inloggen ----------

    private fun willekeurig(n: Int, tekens: String): String {
        val r = SecureRandom()
        return buildString { repeat(n) { append(tekens[r.nextInt(tekens.length)]) } }
    }

    /** Een nieuwe inlogpoging: de URL voor SOMtoday; verifier en state worden bewaard tot de terugkeer. */
    fun startUrl(ctx: Context): String {
        val verifier = willekeurig(96, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~")
        val state = willekeurig(24, "abcdefghijklmnopqrstuvwxyz0123456789")
        val hash = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray())
        val challenge = Base64.encodeToString(hash, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        prefs(ctx).edit().putString("verifier", verifier).putString("state", state).apply()
        return Uri.parse("$INLOG/oauth2/authorize").buildUpon()
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", KLANT)
            .appendQueryParameter("redirect_uri", TERUG)
            .appendQueryParameter("scope", "openid")
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("state", state)
            .appendQueryParameter("session", "no_session")
            .appendQueryParameter("claims", CLAIMS)
            .build().toString()
    }

    /** De terugkeer van SOMtoday (somtoday://…?code=…): code inwisselen voor tokens. Niet op de hoofddraad. */
    fun klaarMetInloggen(ctx: Context, terug: Uri) {
        terug.getQueryParameter("error")?.let { throw Fout("SOMtoday: ${terug.getQueryParameter("error_description") ?: it}") }
        val code = terug.getQueryParameter("code") ?: throw Fout("SOMtoday gaf geen inlogcode terug")
        val p = prefs(ctx)
        val state = terug.getQueryParameter("state")
        if (state != null && state != p.getString("state", null)) throw Fout("Deze inlogpoging is verlopen, probeer het opnieuw")
        val verifier = p.getString("verifier", null) ?: throw Fout("Deze inlogpoging is verlopen, probeer het opnieuw")
        tokens(
            ctx, mapOf(
                "grant_type" to "authorization_code", "code" to code, "redirect_uri" to TERUG,
                "code_verifier" to verifier, "client_id" to KLANT, "scope" to "openid", "claims" to CLAIMS,
            )
        )
        p.edit().remove("verifier").remove("state").apply()
    }

    private fun tokens(ctx: Context, velden: Map<String, String>) {
        val conn = URL("$INLOG/oauth2/token").openConnection() as HttpURLConnection
        val d = try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 20_000
            conn.doOutput = true
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.outputStream.use { out ->
                out.write(velden.entries.joinToString("&") { "${it.key}=${URLEncoder.encode(it.value, "UTF-8")}" }.toByteArray())
            }
            val status = conn.responseCode
            val text = (if (status < 400) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrDefault(JSONObject())
            if (status >= 400 || !json.has("access_token")) {
                val msg = json.optString("error_description").ifEmpty { json.optString("error") }.ifEmpty { "SOMtoday zegt $status" }
                throw Fout(msg, if (status == 400 || status == 401) 401 else status)
            }
            json
        } catch (e: Fout) {
            throw e
        } catch (e: Exception) {
            throw Fout("SOMtoday is niet bereikbaar")
        } finally {
            conn.disconnect()
        }
        var school = ""
        runCatching {
            val deel = d.getString("id_token").split(".")[1]
            school = JSONObject(String(Base64.decode(deel, Base64.URL_SAFE or Base64.NO_PADDING))).optString("orgname")
        }
        val p = prefs(ctx)
        p.edit()
            .putString("access", d.getString("access_token"))
            .putString("refresh", d.optString("refresh_token").ifEmpty { p.getString("refresh", null) })
            .putLong("verloopt", System.currentTimeMillis() + d.optLong("expires_in", 3600) * 1000)
            .putString("api", veiligeApi(d.optString("somtoday_api_url")))
            .apply { if (school.isNotEmpty()) putString("school", school) }
            .apply()
    }

    private fun veiligeApi(u: String): String = runCatching {
        val x = URL(u)
        if (x.protocol == "https" && (x.host == "somtoday.nl" || x.host.endsWith(".somtoday.nl"))) "https://${x.host}" else null
    }.getOrNull() ?: "https://api.somtoday.nl"

    fun ingelogd(ctx: Context) = prefs(ctx).getString("refresh", null) != null || prefs(ctx).getString("access", null) != null

    fun school(ctx: Context) = prefs(ctx).getString("school", "") ?: ""

    fun uitloggen(ctx: Context) {
        prefs(ctx).edit().clear().apply()
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Geldig toegangstoken, zo nodig ververst. Eén tegelijk, ook als pagina en meldingen tegelijk vragen. */
    private fun token(ctx: Context, forceer: Boolean = false): String = synchronized(slot) {
        val p = prefs(ctx)
        val access = p.getString("access", null)
        if (!forceer && access != null && System.currentTimeMillis() < p.getLong("verloopt", 0) - 90_000) return access
        val refresh = p.getString("refresh", null) ?: throw Fout("Niet ingelogd", 401)
        try {
            tokens(ctx, mapOf("grant_type" to "refresh_token", "refresh_token" to refresh, "client_id" to KLANT, "scope" to "openid", "claims" to CLAIMS))
        } catch (e: Fout) {
            if (e.status == 401) uitloggen(ctx)
            throw e
        }
        return p.getString("access", null) ?: throw Fout("Niet ingelogd", 401)
    }

    // ---------- de REST-api ----------

    /**
     * Een verzoek naar <api>/rest/v1/<pad>. Bij een verlopen token één keer verversen en opnieuw.
     * Gooit alleen bij geen verbinding of uitgelogd; andere statussen komen gewoon terug.
     */
    fun vraag(ctx: Context, methode: String, pad: String, accept: String? = null, range: String? = null, body: String? = null): Antwoord {
        require(Regex("^[\\w/~.-]+(\\?[\\w=&%.~,:+-]*)?$").matches(pad)) { "ongeldig pad" }
        var a = stuur(ctx, token(ctx), methode, pad, accept, range, body)
        if (a.status == 401) a = stuur(ctx, token(ctx, forceer = true), methode, pad, accept, range, body)
        return a
    }

    private fun stuur(ctx: Context, token: String, methode: String, pad: String, accept: String?, range: String?, body: String?): Antwoord {
        val api = prefs(ctx).getString("api", null) ?: "https://api.somtoday.nl"
        val conn = URL("$api/rest/v1/$pad").openConnection() as HttpURLConnection
        try {
            conn.requestMethod = methode
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Accept", accept ?: "application/json")
            if (range != null) conn.setRequestProperty("Range", range)
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            val status = conn.responseCode
            val text = (if (status < 400) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            return Antwoord(status, text, conn.getHeaderField("Content-Range"))
        } catch (e: Exception) {
            throw Fout("Geen verbinding met SOMtoday")
        } finally {
            conn.disconnect()
        }
    }

    /** Alle items van een lijst (SOMtoday geeft er hooguit 100 per keer, met Range). */
    fun alles(ctx: Context, pad: String, accept: String? = null): List<JSONObject> {
        val items = ArrayList<JSONObject>()
        var van = 0
        while (true) {
            val a = vraag(ctx, "GET", pad, accept, "items=$van-${van + 99}")
            if (a.status !in 200..299) throw Fout("SOMtoday zegt ${a.status}", a.status)
            val lijst = runCatching { JSONObject(a.body).optJSONArray("items") }.getOrNull() ?: break
            for (i in 0 until lijst.length()) items.add(lijst.getJSONObject(i))
            val m = Regex("(\\d+)-(\\d+)/(\\d+)").find(a.range.orEmpty())
            if (m == null || lijst.length() == 0 || m.groupValues[2].toInt() + 1 >= m.groupValues[3].toInt() || van > 3000) break
            van = m.groupValues[2].toInt() + 1
        }
        return items
    }

    /** Het id van de leerling (eerste van het account), bewaard. */
    fun leerlingId(ctx: Context): Long {
        val p = prefs(ctx)
        p.getLong("leerling", 0).takeIf { it > 0 }?.let { return it }
        val a = vraag(ctx, "GET", "leerlingen")
        val l = runCatching { JSONObject(a.body).getJSONArray("items").getJSONObject(0) }.getOrNull() ?: throw Fout("Geen leerling gevonden")
        val id = l.optJSONArray("links")?.optJSONObject(0)?.optLong("id") ?: l.optLong("id")
        p.edit().putLong("leerling", id).apply()
        return id
    }
}
