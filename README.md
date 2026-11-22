# Scorroday

SOMtoday, maar dan fijn. Rooster, cijfers, huiswerk, berichten en meldingen in één rustige app.

- **Android** (`android/` + `app/`): de app. Download de nieuwste `Scorroday.apk` bij [Releases](../../releases/latest); daarna werkt hij zichzelf bij.
- **Lumia / Windows 10 Mobile** (`public/` + `src/worker.js`): het rooster voor de Lumia 435, op scorroday.timvanbergen.nl.

## Wat de Android-app kan

- **Vandaag**: welke les nu bezig is of als volgende komt, uitval, huiswerk voor morgen, toetsen van de komende twee weken, je laatste cijfers en de volgende vakantie.
- **Rooster**: per week, vegen voor de volgende dag, uitval doorgestreept, lokaalwijzigingen en huiswerk of toetsen bij de les.
- **Cijfers**: nieuwste eerst of per vak, gemiddelden per periode, een grafiek per vak en *Wat moet ik halen?*. Nieuwe cijfers kun je eerst verbergen tot je erop tikt.
- **Huiswerk**: afvinken (gaat ook naar SOMtoday), toetsen, bijlagen en je eigen taken (de +-knop).
- **Berichten**, **afwezigheid**, **leermiddelen** en je **rooster in je agenda** (iCal-link), via de knoppen rechtsboven.
- **Meldingen**: nieuwe cijfers, uitval of een ander lokaal, nieuwe toetsen of nieuw huiswerk en berichten. De app kijkt ongeveer elk kwartier op de achtergrond.
- Een **demo** met verzonnen gegevens, om rond te kijken zonder in te loggen.

## Hoe het werkt

Je logt in bij SOMtoday zelf (school kiezen, schoolaccount, Microsoft of Entree), net als in de officiële app (OAuth met PKCE).
De tokens blijven op je telefoon en alle verzoeken gaan rechtstreeks van de app naar SOMtoday; er zit geen server tussen.
De pagina's (`app/`) zitten in de APK; `MainActivity` geeft ze een brug (`ScorroNative.api`) naar `Som.kt`, en `Meldingen.kt` kijkt met WorkManager op de achtergrond.

Scorroday is een eigen project en hoort niet bij SOMtoday of Topicus.

## Bouwen

```sh
cd android && ./gradlew assembleRelease
```

Bij elke push naar `main` die `android/` of `app/` raakt, bouwt GitHub Actions een ondertekende APK en zet die als release online (`v1.0.N`). De app kijkt daar zelf naar updates.
