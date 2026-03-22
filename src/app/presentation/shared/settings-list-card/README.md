# SettingsListCardComponent

Eine wiederverwendbare Base-Komponente für Settings-Listen im Card-Layout. Reduziert Code-Duplikation (DRY) für alle Settings-Komponenten mit ähnlicher Struktur.

## Struktur

```
┌─────────────────────────────────────┐
│ Header (Überschrift)                │
├─────────────────────────────────────┤
│ [Optional: Table Header]            │
├─────────────────────────────────────┤
│ Container-Box (scrollbar, 242px)    │
│   - Row 1                           │
│   - Row 2                           │
│   - ...                             │
├─────────────────────────────────────┤
│ [Optional: Add-Button]              │
└─────────────────────────────────────┘
```

## API

### Inputs

| Input | Type | Default | Beschreibung |
|-------|------|---------|--------------|
| `headline` | `string` | **required** | Überschrift der Card |
| `addLabel` | `string` | `'Hinzufügen'` | Label des Add-Buttons |
| `showAddButton` | `boolean` | `true` | Add-Button anzeigen |
| `showHeader` | `boolean` | `false` | Table-Header-Slot anzeigen |

### Outputs

| Output | Type | Beschreibung |
|--------|------|--------------|
| `addClick` | `EventEmitter<void>` | Wird beim Klick auf Add-Button emittiert |

### Content Projection Slots

| Slot | Selektor | Beschreibung |
|------|----------|--------------|
| Header | `[header]` | Table-Header-Komponente (nur wenn `showHeader=true`) |
| Rows | `[rows]` | Container für die Liste der Row-Komponenten |

## Verwendung

### Basis-Beispiel (ohne Header)

```html
<app-settings-list-card
  [headline]="translate.instant('settings.my-feature.headline')"
  [addLabel]="translate.instant('settings.my-feature.add')"
  (addClick)="onClickAdd()"
>
  <div rows>
    @for (item of itemList(); track item.id; let i = $index) {
      <app-my-row
        [data]="item"
        (deleteEvent)="onDelete(i)"
      />
    }
  </div>
</app-settings-list-card>
```

### Mit Table-Header

```html
<app-settings-list-card
  [headline]="translate.instant('setting.macro.headline')"
  [addLabel]="translate.instant('setting.macro.add')"
  [showHeader]="true"
  (addClick)="onClickAdd()"
>
  <app-macro-header header></app-macro-header>

  <div rows>
    @for (item of macroList; track item.id; let i = $index) {
      <app-macro-row [data]="item" (isDeleteEvent)="onDelete(i)" />
    }
  </div>
</app-settings-list-card>
```

### Ohne Add-Button (nur Anzeige)

```html
<app-settings-list-card
  [headline]="'Übersicht'"
  [showAddButton]="false"
>
  <div rows>
    @for (item of readOnlyList; track item.id) {
      <app-readonly-row [data]="item" />
    }
  </div>
</app-settings-list-card>
```

## Migration einer bestehenden Komponente

### Vorher (alte Struktur)

```html
<!-- my-feature.component.html -->
<form id="my-feature-form">
  <div class="container-header">
    {{ translate.instant("settings.my-feature.headline") }}
  </div>
  <div class="container-line"></div>
  <div class="container-box">
    @for (item of itemList; track item.id; let i = $index) {
      <app-my-row [data]="item" (deleteEvent)="onDelete(i)" />
    }
  </div>
  <div class="row">
    <span class="add-button" (click)="onClickAdd()">
      {{ translate.instant("settings.my-feature.add") }}
    </span>
  </div>
</form>
```

```scss
/* my-feature.component.scss */
@use "sass:color";
@use "../../../../../assets/standard-styles/standard-card-interior.scss";
@use "../../../../../assets/standard-styles/colors.scss" as colors;

.add-button {
  margin-left: 165px;
  font-size: 13px;
  text-decoration: underline;
  color: colors.$standartGreenColor;
  cursor: pointer;

  &:hover {
    color: color.adjust(colors.$standartGreenColor, $lightness: -10%);
  }
}

.container-box {
  flex: 1;
  height: 242px;
  box-sizing: content-box;
  overflow-x: hidden;
  overflow-y: auto;
}
```

### Nachher (mit Base-Komponente)

```html
<!-- my-feature.component.html -->
<app-settings-list-card
  [headline]="translate.instant('settings.my-feature.headline')"
  [addLabel]="translate.instant('settings.my-feature.add')"
  (addClick)="onClickAdd()"
>
  <div rows>
    @for (item of itemList; track item.id; let i = $index) {
      <app-my-row [data]="item" (deleteEvent)="onDelete(i)" />
    }
  </div>
</app-settings-list-card>
```

```scss
/* my-feature.component.scss */
:host {
  display: block;
  height: 100%;
}
```

### TypeScript-Änderungen

```typescript
// Vorher
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

@Component({
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    MyRowComponent
  ],
})

// Nachher
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';

@Component({
  imports: [
    TranslateModule,
    SettingsListCardComponent,
    MyRowComponent,
  ],
})
```

## Wichtige Hinweise

### Content Projection mit `<div rows>`

**WICHTIG:** Verwende `<div rows>` statt `<ng-container rows>`.

`ng-container` wird zur Compile-Zeit entfernt, wodurch das `rows`-Attribut nicht im DOM existiert und Content Projection nicht funktioniert.

```html
<!-- FALSCH - funktioniert nicht -->
<ng-container rows>
  @for (item of list; track item.id) { ... }
</ng-container>

<!-- RICHTIG -->
<div rows>
  @for (item of list; track item.id) { ... }
</div>
```

### Daten laden nicht vergessen

Die Base-Komponente lädt keine Daten. Die Parent-Komponente muss `ngOnInit` implementieren und die Daten laden:

```typescript
export class MyFeatureComponent implements OnInit {
  ngOnInit(): void {
    this.myService.loadData();  // Nicht vergessen!
  }
}
```

## Bereits migrierte Komponenten

- `identity-providers` - Identity Provider für LDAP/OAuth
- `macros` - Makros für Berechnungen

## Kandidaten für Migration

Diese Komponenten haben die gleiche Struktur und können migriert werden:

- `state` - Bundesländer
- `countries` - Länder
- `branches` - Filialen
- `group-scope` - Gruppenrechte
- `contracts` - Verträge
- `llm-providers` - LLM Provider
- `llm-models` - LLM Modelle
- `grid-color` - Grid-Farben
- `absence` - Abwesenheitsgründe

## Styling

Die Base-Komponente verwendet diese CSS-Klassen:

- `.container-header` - aus `standard-card-interior.scss`
- `.container-line` - aus `standard-card-interior.scss`
- `.container-box` - scrollbarer Bereich (height: 242px)
- `.add-button` - grüner Link-Style Button
