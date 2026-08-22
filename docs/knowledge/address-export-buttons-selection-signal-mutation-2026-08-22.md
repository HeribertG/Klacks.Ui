# Address-Liste: Export-Buttons folgen nicht der Selektion + Signal-Mutation-Falle

Datum: 2026-08-22

`AllAddressListComponent` (`all-address-list.component.ts`/`.html`), PDF- und Excel-Export-Buttons in der Toolbar.

## Bug 1: Buttons gaten auf der falschen Bedingung, gerendert als zwei DOM-Varianten

Ursprünglich gated `@if (!(dataManagementClientService.headerCheckBoxValue() || checkBoxIndeterminate))` zwei komplett unterschiedliche Elemente:
- Disabled-Zustand: eigenes `<button class="ownStyle-button-disabled">` **ganz ohne `(click)`-Handler**.
- Aktiv-Zustand: `<div role="button" class="ownStyle-button" (click)="...">`.

Zwei Probleme:
1. Die Bedingung bezog sich auf den Header-Checkbox-Zustand, nicht auf die tatsächliche Zeilen-Selektion — bei nichts Angehaktem UND Header aus waren die Buttons disabled, obwohl fachlich (laut Owner) die Selektion einzelner Zeilen-Checkboxen massgeblich sein soll.
2. Ein naheliegender "einfacherer" Fix — `[disabled]="!hasSelection()"` direkt auf das aktive Element zu setzen — **funktioniert nicht**, weil das aktive Element ein `<div role="button">` ist, kein echtes `<button>`. Das HTML-`disabled`-Attribut (nativ oder als Angular-Property-Binding) hat auf `<div>`/`<span>` etc. **keinerlei Wirkung** — weder visuell noch verhindert es Klicks. Nur echte Formularelemente (`button`, `input`, `select`, `textarea`, `fieldset`, `option`) werten es aus.

### Fix

Ein einziges Element pro Button, Zustand per Klassen-Toggle statt DOM-Austausch — analog zum bereits vorhandenen `[class.disabled]="isQuickPrinting()"`-Muster desselben PDF-Buttons:

```html
<div
  id="quick-print-button"
  class="btn"
  [class.ownStyle-button]="hasSelection()"
  [class.ownStyle-button-disabled]="!hasSelection()"
  [class.disabled]="isQuickPrinting()"
  role="button"
  (click)="onClickQuickPrint()"
  ...
>
```

Der Klick-Handler guardet zusätzlich in TS (`if (!hasSelection()) return;`), da CSS-Klassen einen Klick nicht verhindern.

`hasSelection` ist ein `computed()`, das dieselbe Logik wie die bereits bestehende `pushSelectionToAssistant()` verwendet:

```typescript
public hasSelection = computed(() =>
  this.dataManagementClientService.clientListService
    .checkedArray()
    .some((c) => c.checked)
);
```

## Bug 2 (der eigentliche Grund, warum der erste Fix "im Test negativ" war): In-Place-Mutation eines Signal-Array-Elements feuert das Signal NICHT

`onChangeCheckBox` hat einen bereits vorhandenen `CheckBoxValue`-Eintrag ursprünglich so aktualisiert:

```typescript
// VORHER — Bug
const tmpCheckBoxValue = this.dataManagementClientService.findCheckBoxValue(tmpClient.id!);
if (tmpCheckBoxValue) {
  tmpCheckBoxValue.checked = isChecked;   // mutiert das Objekt IM Array in-place
} else {
  ...addCheckBoxValueToArray(c);          // ruft checkedArray.update(...) auf
}
```

**Symptom:** Eine Zeilen-Checkbox zum ersten Mal anhaken → Buttons werden korrekt aktiv (geht über den `else`-Zweig, `addCheckBoxValueToArray` → `checkedArray.update()`). Dieselbe Zeile wieder abwählen (oder erneut anhaken) → Buttons bleiben im alten Zustand hängen (geht über den `if`-Zweig, reine Property-Mutation).

**Warum:** `checkedArray` ist ein Angular-`signal<CheckBoxValue[]>`. Ein `computed()`, das `checkedArray()` liest, tracked nur `.set()`/`.update()`-Aufrufe auf dem Signal selbst (Versions-Zähler). Wird stattdessen eine Property eines Objekts **innerhalb** des vom Signal gehaltenen Arrays direkt mutiert, ändert sich die Array-*Referenz* nicht — das Signal bekommt nie ein `.set()`/`.update()`, der Versions-Zähler bleibt gleich, `computed()` liefert seinen gecachten alten Wert zurück, **ohne die Ableitungsfunktion überhaupt erneut auszuführen**. Das gilt unabhängig von Change Detection/Zone.js: Die Komponente wird bei jedem `(change)`-Event zwar neu geprüft (OnPush + Event im eigenen Template), aber `computed()` selbst entscheidet anhand der Signal-Versionen, ob es neu rechnet — und die haben sich nie erhöht.

Nicht betroffen waren rein **imperative** Ein-Weg-Leser desselben Zustands (z. B. `pushSelectionToAssistant()`, das `checkedArray()` synchron einmal ausliest und das Ergebnis weiterreicht) — die sehen die Mutation trotzdem korrekt, weil sie den aktuellen Objekt-Graphen direkt lesen, nicht auf eine Signal-Versionsänderung warten.

### Fix

Nie in-place mutieren, wenn ein Eintrag bereits existiert — stattdessen entfernen und neu hinzufügen (beide Pfade rufen intern `checkedArray.update(...)` auf):

```typescript
// NACHHER
this.dataManagementClientService.removeCheckBoxValueToArray(tmpClient.id!);
const c = new CheckBoxValue();
c.id = tmpClient.id!;
c.checked = isChecked;
this.dataManagementClientService.addCheckBoxValueToArray(c);
```

## Lessons Learned

1. **`[disabled]` auf `<div role="button">` ist wirkungslos** — nur echte Formularelemente werten das Attribut aus. Deaktivierbare Custom-Buttons brauchen entweder ein echtes `<button [disabled]="...">` oder eine CSS-Klasse (`[class.disabled]`) **plus** einen TS-seitigen Guard im Klick-Handler.
2. **Ein Angular-`computed()` erkennt nur Referenzänderungen am Signal selbst, nie Mutationen an Objekten innerhalb eines vom Signal gehaltenen Arrays/Objekts.** Jeder Schreibzugriff auf signal-gehaltenen State muss über `.set()`/`.update()` mit einer neuen Referenz laufen — auch für einzelne Felder verschachtelter Objekte. Codebase-weiter Verdachtsmuster: `tmpX.someField = ...` direkt auf einem aus einem Signal-Array gelesenen Objekt, ohne anschliessenden `.update()`-Aufruf auf dem Array-Signal.
3. **Symptom-Fingerabdruck dieser Klasse von Bug:** "funktioniert beim ersten Mal, aber nicht beim zweiten/beim Zurücksetzen" ist ein starkes Indiz für genau dieses Muster (erster Aufruf nimmt den `add`-Pfad mit `.update()`, Folgeaufrufe nehmen einen Mutations-Pfad ohne `.update()`).
4. Reine imperative Leser (kein `computed()`/`effect()`, sondern ein einmaliger synchroner Read) sind von dieser Falle nicht betroffen — das kann beim Debuggen in die Irre führen, wenn man nur einen der beiden Konsumenten testet.

## Komponenten

- `Klacks.Ui/src/app/presentation/workplace/address/all-address/all-address-list/all-address-list.component.ts` — `hasSelection`, `onChangeCheckBox`, `onClickExportExcel`, `onClickQuickPrint`
- `Klacks.Ui/src/app/presentation/workplace/address/all-address/all-address-list/all-address-list.component.html` — Button-Templates
- `Klacks.Ui/src/app/domain/services/client/client-list.service.ts` — `checkedArray`-Signal, `addCheckBoxValueToArray`, `removeCheckBoxValueToArray`

## Offene Flanke (nicht behoben, ausserhalb Scope dieser Session)

`ClientListService.buildExportSelection()` (`client-list.service.ts:88-102`) mappt `checkedArray().map(x => x.id)` ohne nach `.checked` zu filtern — das kann bei bestimmten Ab-/Anwahl-Reihenfolgen falsche IDs in den Export-Request (`selectAll`/`invertedSelection`/`selection`) schicken. Wurde in dieser Session analysiert und einmal implementiert, dann aber vom Owner explizit zurückgenommen ("hat es schlimmer gemacht") zugunsten der einfacheren `hasSelection()`-Lösung oben. Nicht erneut versuchen ohne den Owner zu fragen, ob der Datenfehler bei `buildExportSelection()` tatsächlich reproduzierbar ist.

## Verwandte Einträge

- [[onpush-ngbmodal-templateref-needs-signals]] — verwandtes Signal/OnPush-Thema in Klacks.Ui
