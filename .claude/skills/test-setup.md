# Test Setup

## Test Framework

- **Vitest** (ersetzt Karma/Jasmine seit Angular 21)
- ~1500 Tests

## Test Commands

| Befehl | Beschreibung |
|--------|--------------|
| `npm test` | Tests + HTML-Report öffnet automatisch |
| `npm run test:no-report` | Nur Tests ohne Report |
| `npm run test:watch` | Tests im Watch-Modus |

## HTML Report

- **Pfad:** `test-results/report.html`
- **Format:** Statisches HTML (kein Server erforderlich)
- **Öffnet automatisch** nach `npm test`

## Konfigurationsdateien

| Datei | Beschreibung |
|-------|--------------|
| `vitest.config.ts` | Vitest Konfiguration |
| `angular.json` | `runnerConfig` verweist auf vitest.config.ts |
| `src/test-setup.ts` | Test-Setup (TestBed, Zone.js) |

## Scripts

| Datei | Beschreibung |
|-------|--------------|
| `scripts/run-tests.js` | Cross-Platform Test-Runner |
| `scripts/generate-test-report.js` | HTML-Report aus JSON |

## Plattform-Kompatibilität

Bei Plattformwechsel (WSL <-> Windows):

```bash
npm install esbuild --force
npm install rollup --force
```

## Test-Struktur

```
describe('ComponentName - Feature', () => {
  it('should description', () => {
    // Arrange
    const input = ...;

    // Act
    const result = component.method(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```
