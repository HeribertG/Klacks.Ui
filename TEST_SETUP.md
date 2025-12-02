# Test Setup

**Stand:** 02.12.2025

---

## Test Framework

- **Vitest** (ersetzt Karma/Jasmine seit Angular 21)
- ~1500 Tests

---

## Test Commands

| Befehl | Beschreibung |
|--------|--------------|
| `npm test` | Tests ausführen + HTML-Report öffnet automatisch |
| `npm run test:no-report` | Nur Tests ohne Report |
| `npm run test:watch` | Tests im Watch-Modus |

---

## HTML Report

Der HTML-Report wird im Karma-Stil generiert und zeigt alle Tests mit vollständigen Namen.

- **Report-Pfad:** `test-results/report.html`
- **Format:** Statisches HTML (kein Server erforderlich)
- **Öffnet automatisch** nach `npm test`

### Beispiel-Output

```
Tested with Vitest on Mon, Dec 2, 2025
1510 specs, 0 failed, 21 pending

AppComponent
    should create the app
    should have as title 'klacks'

CutShiftListComponent - Time Cut Logic ValidateAndCorrectTime Logic Tests
    Validate Time Test 1: Normal shift (07:00-15:00): User enters 16:00 → corrected to 14:59
    Validate Time Test 2: Normal shift (07:00-15:00): User enters 06:00 → corrected to 07:01
    ...
```

---

## Konfigurationsdateien

| Datei | Beschreibung |
|-------|--------------|
| `vitest.config.ts` | Vitest Konfiguration mit JSON-Reporter |
| `angular.json` | `runnerConfig` verweist auf vitest.config.ts |
| `src/test-setup.ts` | Test-Setup (TestBed, Zone.js) |

---

## Scripts

| Datei | Beschreibung |
|-------|--------------|
| `scripts/run-tests.js` | Cross-Platform Test-Runner (Windows + WSL) |
| `scripts/generate-test-report.js` | Generiert statischen HTML-Report aus JSON |

---

## Plattform-Kompatibilität

Die Test-Scripts funktionieren auf:
- **Windows PowerShell**
- **WSL (Windows Subsystem for Linux)**

Bei Plattformwechsel (z.B. von WSL zu Windows) kann es nötig sein, die nativen Module neu zu installieren:

```bash
npm install esbuild --force
npm install rollup --force
```

---

## Changelog

### 02.12.2025 - Migration zu Vitest

- Migration von Karma/Jasmine zu Vitest
- Neuer statischer HTML-Reporter im Karma-Stil
- Cross-Platform Test-Runner Scripts
