# Leaflet Default Marker Icons in Angular

Datum: 2026-05-20 (aktualisiert 2026-08-11)

Das `DashboardClientsLocationsComponent` zeigt Client-Standorte auf einer Leaflet-Karte mit Marker-Clustering. Leaflet's Standard-Marker-Icons (`marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`) werden nicht gefunden — 404 → sichtbar als "Missing Image"-Icon statt Pin.

**Zwei unabhängige Root Causes wurden für dasselbe Symptom gefunden. Beide müssen behoben sein.**

## Root Cause 1 (2026-05-20): Icons fehlen im Build-Output

Leaflet (geladen via `node_modules/leaflet/dist/leaflet.js` in `angular.json` scripts) erwartet seine Default-Icons unter dem **Site-Root**. Die Bilder existieren physisch in `node_modules/leaflet/dist/images/` aber werden vom Angular-Build nicht automatisch ausgeliefert.

### Fix 1: Build-Konfiguration — Icons als Assets kopieren

`angular.json`:
```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  {
    "glob": "*.png",
    "input": "node_modules/leaflet/dist/images",
    "output": "assets/leaflet"
  }
]
```

## Root Cause 2 (2026-08-11): `mergeOptions` allein reicht NICHT — `imagePath`-Auto-Detection prependet trotzdem

**Diese Doku hatte bis 2026-08-11 die falsche Schlussfolgerung, dass `L.Icon.Default.mergeOptions({iconUrl: ...})` allein genügt.** In Produktion trat der Bug erneut auf, obwohl `mergeOptions` bereits korrekt gesetzt war: nur 2 von 6 Markern auf der Dashboard-Karte wurden korrekt gezeichnet, der Rest zeigte das Browser-"Missing Image"-Icon.

### Warum `mergeOptions` allein nicht reicht

Leaflet 1.9.4's `Icon.Default.prototype._getIconUrl` (überschreibt die Basis-`Icon._getIconUrl`) macht:

```js
_getIconUrl: function (name) {
  if (typeof IconDefault.imagePath !== 'string') {
    IconDefault.imagePath = this._detectIconPath();
  }
  return (this.options.imagePath || IconDefault.imagePath) + Icon.prototype._getIconUrl.call(this, name);
}
```

Das heißt: selbst wenn `iconUrl` explizit via `mergeOptions` gesetzt ist, wird **immer** ein automatisch erkannter `imagePath` davorgehängt (einmalig berechnet und statisch gecacht, `this.options.imagePath` bleibt leer, da `mergeOptions` das nie setzt). `_detectIconPath()` liest dazu die berechnete `background-image`-CSS-Property eines unsichtbaren `.leaflet-default-icon-path`-Divs — das ist die Regel aus `leaflet.css` (`background-image: url(images/marker-icon.png)`).

**Der Trigger in diesem Projekt:** Angular's esbuild-Build löst das relative `url(images/marker-icon.png)` aus `node_modules/leaflet/dist/leaflet.css` beim Bundling der globalen Styles auf und kopiert das referenzierte PNG in einen `media/`-Output-Ordner (bestätigt im ausgelieferten `styles.css`: `background-image: url("./media/marker-icon.png")`). `_detectIconPath()` liest daraus `http://localhost:4200/media/` als `imagePath`.

Ergebnis: `IconDefault.imagePath` (`http://localhost:4200/media/`) + `iconUrl` (`/assets/leaflet/marker-icon.png`) = `http://localhost:4200/media//assets/leaflet/marker-icon.png` → 404, Marker unsichtbar/broken.

Verifiziert live per Puppeteer gegen den laufenden Dev-Server:
- Ohne Fix: `_getIconUrl('icon')` → `http://localhost:4200/media//assets/leaflet/marker-icon.png` (404, exakt der Screenshot aus dem Bug-Report)
- Mit Fix: `_getIconUrl('icon')` → `/assets/leaflet/marker-icon.png` (200)

### Fix 2: `_getIconUrl`-Override entfernen, VOR `mergeOptions`

```typescript
private initializeMap(): void {
  // ... container guards ...

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/assets/leaflet/marker-icon-2x.png',
    iconUrl: '/assets/leaflet/marker-icon.png',
    shadowUrl: '/assets/leaflet/marker-shadow.png',
  });

  this.map = L.map(mapContainer).setView(...);
  // ...
}
```

`delete` entfernt die Override-Methode von `Icon.Default.prototype`, wodurch über den Prototype-Chain wieder die Basis-`Icon.prototype._getIconUrl` greift — die gibt `iconUrl`/`iconRetinaUrl` direkt zurück, ohne irgendetwas voranzustellen. Das ist der Standard-Community-Fix für Leaflet + Webpack/esbuild-Bundler (siehe auch React-Leaflet-FAQ).

**Wichtig:** `imagePath: ''` in `mergeOptions` zu setzen würde NICHT helfen — `this.options.imagePath || IconDefault.imagePath` behandelt einen leeren String als falsy und fällt trotzdem auf `IconDefault.imagePath` zurück.

## Wichtige Lessons Learned

1. **Leaflet's Default-Icons sind NICHT im JS-Bundle** — sie sind separate PNG-Dateien, die der Browser nachlaedt. Wenn sie nicht ueber den richtigen URL erreichbar sind, gibt es 404 (Pin unsichtbar) ohne JS-Error.

2. **`assets`-Block in angular.json kopiert NICHT rekursiv** — `"node_modules/leaflet/dist/images"` allein wuerde die Bilder unter dem Root-Pfad ablegen, was unsauber ist. Mit `glob/input/output` koennen wir sie in einen sauberen Unterordner verfrachten.

3. **`L.Icon.Default.mergeOptions` muss VOR der ersten Marker-Erzeugung laufen** — sonst nutzen frueh erzeugte Marker (z.B. in `ngOnInit` BEFORE map init) noch die alten URLs.

4. **`mergeOptions({iconUrl: ...})` reicht NICHT aus, um Leaflet's `imagePath`-Auto-Detection zu deaktivieren** — `Icon.Default._getIconUrl` prependet den erkannten `imagePath` immer, auch bei explizit gesetztem `iconUrl`. Nur `delete L.Icon.Default.prototype._getIconUrl` (VOR `mergeOptions`) schaltet das ab. Dieser Bug ist bundler-abhängig: er tritt auf, sobald das Build-Tool das von `leaflet.css` referenzierte PNG in einen erkennbaren Output-Pfad verschiebt (hier: esbuild → `/media/`), und war beim ursprünglichen Fix (2026-05-20, vermutlich Webpack-Builder oder anderer CSS-Asset-Pfad) nicht reproduzierbar.

5. **Anti-Pattern**: Default-Icons per Custom-Icon ersetzen — funktioniert, aber dann muss jeder `L.marker(...)`-Call explizit `{icon: ...}` setzen. Mehr Code, mehr Vergessensgefahr.

6. **Beim Plugin-Layout** (z.B. `MarkerClusterGroup`): cluster-internal erzeugte Marker greifen auch auf `L.Icon.Default` zurueck — mergeOptions (und der `delete`-Fix) deckt sie automatisch ab.

7. **Diagnose-Technik für "manche Marker kaputt, manche nicht"-Symptome:** direkter HTTP-Request gegen die im DOM sichtbare `<img src>` (per PowerShell `Invoke-WebRequest` aus WSL, da `curl localhost` aus WSL2 nicht zum Windows-Host routet) bestätigt 404 vs. 200 hart. Zusätzlich: Puppeteer im Browser-Kontext gegen den laufenden Dev-Server ausführen und Leaflet's eigene `_getIconUrl()`-Methode direkt aufrufen, um die tatsächlich berechnete URL zu sehen — keine Vermutung nötig.

## Komponente

Pfad: `Klacks.Ui/src/app/presentation/workplace/dashboard/dashboard-clients-locations/dashboard-clients-locations.component.ts`

Funktion: `initializeMap()`

## Verwandte Eintraege

- [[docker-volume-permissions-klacks-api]] — Container-Setup, in dem die Angular-Assets via Nginx ausgeliefert werden
