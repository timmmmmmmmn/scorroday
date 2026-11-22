package nl.timvanbergen.scorroday

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.IsoFields
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Meldingen op de achtergrond: elk kwartier (als Android het toelaat) kijken of er iets nieuws is in SOMtoday:
 * een cijfer, een les die vervalt of van lokaal wisselt, een nieuwe toets of huiswerk, of een bericht.
 * De eerste keer wordt alleen onthouden wat er al was, zodat je niet overspoeld wordt.
 */
object Meldingen {
    private const val WERK = "scorroday-meldingen"
    private const val PREFS = "meldingen"
    const val EXTRA_TAB = "tab"

    val SOORTEN = listOf("cijfers", "rooster", "toetsen", "huiswerk", "berichten")
    private val STANDAARD = mapOf("cijfers" to true, "rooster" to true, "toetsen" to true, "huiswerk" to false, "berichten" to true, "cijferTonen" to true)
    private val NAMEN = mapOf("cijfers" to "Nieuwe cijfers", "rooster" to "Roosterwijzigingen", "toetsen" to "Nieuwe toetsen", "huiswerk" to "Nieuw huiswerk", "berichten" to "Berichten")

    private val CIJFERTYPES = setOf("Toetskolom", "DeeltoetsKolom", "Werkstukcijferkolom", "Advieskolom", "SamengesteldeToetsKolom", "RapportToetskolom")

    fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun instellingen(ctx: Context): JSONObject {
        val p = prefs(ctx)
        return JSONObject().apply { STANDAARD.forEach { (k, v) -> put(k, p.getBoolean("aan_$k", v)) } }
    }

    fun zet(ctx: Context, json: String) {
        val o = runCatching { JSONObject(json) }.getOrNull() ?: return
        val e = prefs(ctx).edit()
        STANDAARD.keys.forEach { k -> if (o.has(k)) e.putBoolean("aan_$k", o.optBoolean(k)) }
        e.apply()
    }

    private fun aan(ctx: Context, k: String) = prefs(ctx).getBoolean("aan_$k", STANDAARD[k] ?: true)

    fun kanalen(ctx: Context) {
        val m = ctx.getSystemService(NotificationManager::class.java)
        NAMEN.forEach { (id, naam) ->
            if (m.getNotificationChannel(id) == null) {
                m.createNotificationChannel(NotificationChannel(id, naam, if (id == "rooster" || id == "cijfers") NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_DEFAULT))
            }
        }
    }

    /** Na inloggen en bij elke start: het periodieke werk inplannen (blijft bestaan als het er al is). */
    fun plan(ctx: Context) {
        val werk = PeriodicWorkRequestBuilder<Controle>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WERK, ExistingPeriodicWorkPolicy.KEEP, werk)
    }

    fun nu(ctx: Context) {
        WorkManager.getInstance(ctx).enqueueUniqueWork("$WERK-nu", ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<Controle>().build())
    }

    fun stop(ctx: Context) {
        WorkManager.getInstance(ctx).cancelUniqueWork(WERK)
        prefs(ctx).edit().apply { all(ctx).forEach { remove(it) } }.apply()
    }

    private fun all(ctx: Context) = prefs(ctx).all.keys.filter { !it.startsWith("aan_") }

    // ---------- controleren ----------

    class Controle(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
        override fun doWork(): Result {
            val ctx = applicationContext
            if (!Som.ingelogd(ctx)) return Result.success()
            kanalen(ctx)
            val id = try { Som.leerlingId(ctx) } catch (e: Exception) { return Result.retry() }
            // Elk onderdeel apart: als er één misgaat, gaan de andere gewoon door.
            runCatching { if (aan(ctx, "cijfers")) cijfers(ctx, id) }
            runCatching { if (aan(ctx, "rooster")) rooster(ctx, id) }
            runCatching { if (aan(ctx, "toetsen") || aan(ctx, "huiswerk")) huiswerk(ctx) }
            runCatching { if (aan(ctx, "berichten")) berichten(ctx) }
            return Result.success()
        }
    }

    /** Vergelijkt met wat de vorige keer gezien is: gewijzigde sleutels met hun oude waarde (null = nieuw). Niets bij de eerste keer. */
    private fun nieuw(ctx: Context, naam: String, nu: Map<String, String>): Map<String, String?> {
        val p = prefs(ctx)
        val oud = p.getString("gezien_$naam", null)?.let { runCatching { JSONObject(it) }.getOrNull() }
        val bewaar = JSONObject()
        nu.forEach { (k, v) -> bewaar.put(k, v) }
        // Oude sleutels die nu niet in de lijst staan blijven een tijdje bewaard, zodat ze niet opnieuw "nieuw" zijn.
        oud?.keys()?.forEach { k -> if (!bewaar.has(k) && bewaar.length() < 3000) bewaar.put(k, oud.get(k)) }
        p.edit().putString("gezien_$naam", bewaar.toString()).apply()
        if (oud == null) return emptyMap()
        return nu.filter { (k, v) -> oud.optString(k, "\u0000") != v }.mapValues { (k, _) -> if (oud.has(k)) oud.optString(k) else null }
    }

    private fun linkId(o: JSONObject): String = o.optJSONArray("links")?.optJSONObject(0)?.optString("id").orEmpty().ifEmpty { o.optString("id") }

    private fun cijfers(ctx: Context, leerling: Long) {
        val items = Som.alles(ctx, "resultaten/huidigVoorLeerling/$leerling")
        val cijfers = items.filter { it.optString("type") in CIJFERTYPES && it.optString("geldendResultaat").isNotEmpty() }
        val sleutels = cijfers.associate { linkId(it) to it.optString("geldendResultaat") }
        val nieuw = nieuw(ctx, "cijfers", sleutels).keys
        val tonen = aan(ctx, "cijferTonen")
        cijfers.filter { linkId(it) in nieuw }.take(6).forEach { c ->
            val vak = c.optJSONObject("vak")?.optString("naam").orEmpty().ifEmpty { "een vak" }
            val cijfer = c.optString("geldendResultaat").replace('.', ',')
            val wat = c.optString("omschrijving").ifEmpty { null }
            meld(
                ctx, "cijfers", "cijfer-${linkId(c)}".hashCode(),
                if (tonen) "$cijfer voor ${vak.lowercaseFirst()}" else "Nieuw cijfer voor ${vak.lowercaseFirst()}",
                listOfNotNull(wat, c.optDouble("weging", Double.NaN).takeIf { !it.isNaN() && it > 0 }?.let { "weging ${fmt(it)}x" }).joinToString(" · ").ifEmpty { "Tik om te bekijken" },
                "cijfers",
            )
        }
    }

    private fun rooster(ctx: Context, leerling: Long) {
        val vandaag = LocalDate.now()
        val lessen = ArrayList<JSONObject>()
        for (plus in listOf(0L, 7L)) {
            val d = vandaag.plusDays(plus)
            val jaar = d.get(IsoFields.WEEK_BASED_YEAR)
            val week = d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
            val lijst = runCatching {
                Som.alles(ctx, "afspraakitems/$leerling/jaar/$jaar/week/$week", "application/vnd.topicus.platinum+json; charset=utf-8")
            }.getOrElse {
                val maandag = d.with(DayOfWeek.MONDAY)
                Som.alles(ctx, "afspraken?begindatum=$maandag&einddatum=${maandag.plusDays(6)}&additional=vak")
            }
            lessen.addAll(lijst)
        }
        val nu = System.currentTimeMillis()
        val tot = nu + 7 * 86_400_000L
        val toekomst = lessen.mapNotNull { les(it) }.filter { it.begin in nu..tot }
        val sleutels = toekomst.associate { it.sleutel to "${it.uitval}|${it.lokaal}|${it.begin}" }
        val gewijzigd = nieuw(ctx, "rooster", sleutels)
        toekomst.filter { it.sleutel in gewijzigd }.take(6).forEach { l ->
            val oud = gewijzigd[l.sleutel]?.split("|")
            val wanneer = wanneer(l.begin) + (l.uur?.let { " ${it}e uur" } ?: "")
            if (l.uitval && oud?.getOrNull(0) != "true") {
                meld(ctx, "rooster", "les-${l.sleutel}".hashCode(), "${l.vak} vervalt", "${wanneer.replaceFirstChar { it.uppercase() }}${l.letOp?.let { " · $it" } ?: ""}", "rooster")
            } else if (!l.uitval && oud != null && l.lokaal.isNotEmpty() && oud.getOrNull(1) != l.lokaal) {
                meld(ctx, "rooster", "les-${l.sleutel}".hashCode(), "${l.vak}: wijziging", "${wanneer.replaceFirstChar { it.uppercase() }} in ${l.lokaal}", "rooster")
            }
        }
    }

    private class Les(val sleutel: String, val begin: Long, val uur: Int?, val vak: String, val lokaal: String, val uitval: Boolean, val letOp: String?)

    private fun les(a: JSONObject): Les? {
        val begin = runCatching { OffsetDateTime.parse(a.optString("beginDatumTijd")).toInstant().toEpochMilli() }.getOrNull() ?: return null
        val ex = a.optJSONObject("additionalObjects")
        val vak = (a.optJSONObject("vak") ?: ex?.optJSONObject("vak"))?.optString("naam").orEmpty().ifEmpty { a.optString("titel", "Les") }
        val meldingen = a.optJSONArray("statusNotifications") ?: JSONArray()
        var uitval = a.optString("afspraakStatus") == "VERVALLEN" || Regex("vervalt|vervallen|uitval", RegexOption.IGNORE_CASE).containsMatchIn(a.optString("titel"))
        var letOp: String? = a.optString("wijzigingOmschrijving").ifEmpty { null }
        for (i in 0 until meldingen.length()) {
            val m = meldingen.optJSONObject(i) ?: continue
            if (m.optString("status") == "4007") uitval = true else if (letOp == null && m.optString("status") != "2002") letOp = m.optString("message").ifEmpty { null }
        }
        val sleutel = linkId(a).ifEmpty { "$begin-$vak" }
        return Les(sleutel, begin, a.optInt("beginLesuur", 0).takeIf { it > 0 }, vak, a.optString("locatie"), uitval, letOp)
    }

    private fun huiswerk(ctx: Context) {
        val vanaf = LocalDate.now().toString()
        val items = ArrayList<JSONObject>()
        for (soort in listOf("studiewijzeritemafspraaktoekenningen", "studiewijzeritemdagtoekenningen")) {
            runCatching { items.addAll(Som.alles(ctx, "$soort?begintNaOfOp=$vanaf")) }
        }
        val sleutels = items.associate { linkId(it) to "1" }
        val nieuw = nieuw(ctx, "huiswerk", sleutels).filterValues { it == null }.keys
        items.filter { linkId(it) in nieuw }.take(6).forEach { h ->
            val item = h.optJSONObject("studiewijzerItem") ?: h.optJSONObject("additionalObjects")?.optJSONObject("studiewijzerItem") ?: return@forEach
            val type = item.optString("huiswerkType")
            val toets = type == "TOETS" || type == "GROTE_TOETS"
            if (toets && !aan(ctx, "toetsen") || !toets && !aan(ctx, "huiswerk")) return@forEach
            val vak = h.optJSONObject("lesgroep")?.optJSONObject("vak")?.optString("naam").orEmpty()
            val datum = runCatching { OffsetDateTime.parse(h.optString("datumTijd")).toInstant().toEpochMilli() }.getOrNull()
            val titel = (if (type == "GROTE_TOETS") "Nieuwe grote toets" else if (toets) "Nieuwe toets" else "Nieuw huiswerk") + (if (vak.isNotEmpty()) " · $vak" else "")
            val tekst = listOfNotNull(datum?.let { wanneer(it).replaceFirstChar { c -> c.uppercase() } }, item.optString("onderwerp").ifEmpty { null }).joinToString(": ")
            meld(ctx, if (toets) "toetsen" else "huiswerk", "hw-${linkId(h)}".hashCode(), titel, tekst, "huiswerk")
        }
    }

    private fun berichten(ctx: Context) {
        val a = Som.vraag(ctx, "GET", "boodschappen/conversaties?additional=verzenderCorrespondent&additional=verzondenDoorGebruiker", range = "items=0-49")
        if (a.status !in 200..299) return
        val conv = JSONObject(a.body).optJSONArray("items") ?: return
        val lijst = ArrayList<JSONObject>()
        for (i in 0 until conv.length()) {
            val b = conv.optJSONObject(i)?.optJSONArray("boodschappen") ?: continue
            for (j in 0 until b.length()) b.optJSONObject(j)?.let { lijst.add(it) }
        }
        val van = lijst.filter { it.optJSONObject("additionalObjects")?.optBoolean("verzondenDoorGebruiker") != true }
        val nieuw = nieuw(ctx, "berichten", van.associate { linkId(it) to "1" }).filterValues { it == null }.keys
        van.filter { linkId(it) in nieuw }.take(4).forEach { b ->
            val afzender = b.optJSONObject("additionalObjects")?.optJSONObject("verzenderCorrespondent")?.optString("naam").orEmpty()
            meld(ctx, "berichten", "msg-${linkId(b)}".hashCode(), if (afzender.isNotEmpty()) "Bericht van $afzender" else "Nieuw bericht", b.optString("onderwerp"), "berichten")
        }
    }

    // ---------- tonen ----------

    private fun meld(ctx: Context, kanaal: String, id: Int, titel: String, tekst: String, tab: String) {
        // Zit je in de app, dan zie je het daar al.
        if (MainActivity.inFront) return
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val open = Intent(ctx, MainActivity::class.java).putExtra(EXTRA_TAB, tab).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val tik = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(ctx, kanaal)
            .setSmallIcon(R.drawable.ic_stat)
            .setColor(ctx.getColor(R.color.accent))
            .setContentTitle(titel)
            .setContentText(tekst)
            .setStyle(Notification.BigTextStyle().bigText(tekst))
            .setContentIntent(tik)
            .setGroup(kanaal)
            .setAutoCancel(true)
            .build()
        runCatching { ctx.getSystemService(NotificationManager::class.java).notify(id, n) }
    }

    private val DAG = DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.forLanguageTag("nl"))

    private fun wanneer(t: Long): String {
        val d = java.time.Instant.ofEpochMilli(t).atZone(ZoneId.systemDefault()).toLocalDate()
        val vandaag = LocalDate.now()
        return when (d) {
            vandaag -> "vandaag"
            vandaag.plusDays(1) -> "morgen"
            vandaag.plusDays(2) -> "overmorgen"
            else -> DAG.format(d)
        }
    }

    private fun fmt(x: Double) = if (x == Math.floor(x)) x.toLong().toString() else x.toString().replace('.', ',')

    private fun String.lowercaseFirst() = if (length > 1 && this[1].isLowerCase()) replaceFirstChar { it.lowercase() } else this
}
