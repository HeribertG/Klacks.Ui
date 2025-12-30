# ViewModel-Pattern für UI-spezifische Typen

## Übersicht

Das Domain Model darf keine UI-Framework-spezifischen Typen enthalten (DDD-Prinzip).
Stattdessen verwenden wir das **ViewModel-Pattern** mit Getter/Settern in der Presentation Layer.

## Betroffene Typen

| UI-Typ | Domain-Typ | Verwendung |
|--------|------------|------------|
| `NgbDateStruct` | `Date` | ng-bootstrap Datepicker |
| `OwnTime` | `number` (Minuten) | Zeit-Eingabefelder |

---

## Pattern 1: NgbDateStruct ↔ Date

### Helper-Funktionen

```typescript
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate
} from 'src/app/shared/helpers/ngb-date.helper';
```

### Einzelnes Datum (Getter/Setter)

```typescript
@Component({ ... })
export class MembershipComponent {
  private dataService = inject(DataManagementClientService);

  // Getter: Domain → UI
  get internalValidFrom(): NgbDateStruct | undefined {
    const date = this.dataService.editClient()?.membership?.validFrom;
    return date ? transformDateToNgbDateStruct(date) : undefined;
  }

  // Setter: UI → Domain
  set internalValidFrom(value: NgbDateStruct | undefined) {
    const client = this.dataService.editClient();
    if (client?.membership && value) {
      client.membership.validFrom = transformNgbDateStructToDate(value);
    }
  }
}
```

**HTML Template:**
```html
<input
  class="form-control"
  [(ngModel)]="internalValidFrom"
  ngbDatepicker
  #dp="ngbDatepicker"
/>
```

### Listen-Elemente (Methoden)

Für Arrays von Objekten mit Datumsfeldern:

```typescript
@Component({ ... })
export class ClientContractsComponent {
  // Getter-Methode für Listen-Element
  getContractFromDate(contract: IClientContract): NgbDateStruct | undefined {
    return contract.fromDate
      ? transformDateToNgbDateStruct(contract.fromDate)
      : undefined;
  }

  // Setter-Methode für Listen-Element
  setContractFromDate(contract: IClientContract, value: NgbDateStruct | undefined): void {
    if (value) {
      contract.fromDate = transformNgbDateStructToDate(value);
    }
    this.onContractChange();
  }
}
```

**HTML Template:**
```html
@for (contract of contracts; track contract.id) {
  <input
    class="form-control"
    [ngModel]="getContractFromDate(contract)"
    (ngModelChange)="setContractFromDate(contract, $event)"
    ngbDatepicker
  />
}
```

---

## Pattern 2: OwnTime ↔ number (Dezimal-Stunden)

### OwnTime Klasse

`OwnTime` ist eine UI-Hilfsklasse für Zeiteingaben mit Stunden:Minuten Format.

```typescript
// Domain Model: Dezimal-Stunden als number
interface IContract {
  guaranteedHoursPerMonth: number;  // z.B. 160.5 = 160h 30min
  minimumHours: number;
  maximumHours: number;
}

// UI: OwnTime für Eingabe
class OwnTime {
  hours: string;    // "160"
  minutes: string;  // "30"
}
```

### Konvertierung: Dezimal-Stunden ↔ OwnTime

```typescript
import {
  transformNumberToOwnTime,
  transformOwnTimeToNumber
} from 'src/app/domain/helpers/own-time.helper';

// Dezimal → OwnTime
transformNumberToOwnTime(160.5, true)
  // hours = Math.floor(160.5) = 160
  // minutes = Math.round(0.5 * 60) = 30
  // → OwnTime { hours: "160", minutes: "30" }

// OwnTime → Dezimal
transformOwnTimeToNumber(ownTime)
  // hours + minutes/60
  // 160 + 30/60 = 160.5
```

### Beispiele

| C# decimal | JSON | TypeScript | OwnTime | Anzeige |
|------------|------|------------|---------|---------|
| 160.00 | 160 | 160 | hours:"160", min:"00" | "160:00" |
| 80.50 | 80.5 | 80.5 | hours:"80", min:"30" | "80:30" |
| 40.25 | 40.25 | 40.25 | hours:"40", min:"15" | "40:15" |

### ViewModel-Interface für Formulare

```typescript
import {
  transformNumberToOwnTime,
  transformOwnTimeToNumber
} from 'src/app/domain/helpers/own-time.helper';

interface ContractFormViewModel {
  internalGuaranteedHours: OwnTime;
  internalMinimumHours: OwnTime;
  internalMaximumHours: OwnTime;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
}

@Component({ ... })
export class ContractsComponent {
  contractForm_: ContractFormViewModel | undefined;

  // ViewModel erstellen beim Bearbeiten
  onClickEdit(contract: IContract): void {
    this.editingContract = contract;
    this.contractForm_ = this.createViewModel(contract);
  }

  private createViewModel(contract: IContract): ContractFormViewModel {
    return {
      // Dezimal-Stunden → OwnTime (isDuration = true für >23h)
      internalGuaranteedHours: transformNumberToOwnTime(contract.guaranteedHoursPerMonth ?? 0, true),
      internalMinimumHours: transformNumberToOwnTime(contract.minimumHoursPerMonth ?? 0, true),
      internalMaximumHours: transformNumberToOwnTime(contract.maximumHoursPerMonth ?? 0, true),
      internalValidFrom: contract.validFrom
        ? transformDateToNgbDateStruct(contract.validFrom)
        : undefined,
      internalValidUntil: contract.validUntil
        ? transformDateToNgbDateStruct(contract.validUntil)
        : undefined,
    };
  }

  // ViewModel zurück zum Domain Model beim Speichern
  private applyViewModelToContract(contract: IContract, vm: ContractFormViewModel): void {
    // OwnTime → Dezimal-Stunden
    contract.guaranteedHoursPerMonth = transformOwnTimeToNumber(vm.internalGuaranteedHours);
    contract.minimumHoursPerMonth = transformOwnTimeToNumber(vm.internalMinimumHours);
    contract.maximumHoursPerMonth = transformOwnTimeToNumber(vm.internalMaximumHours);
    contract.validFrom = vm.internalValidFrom
      ? transformNgbDateStructToDate(vm.internalValidFrom)
      : undefined;
    contract.validUntil = vm.internalValidUntil
      ? transformNgbDateStructToDate(vm.internalValidUntil)
      : undefined;
  }

  onSave(): void {
    if (this.editingContract && this.contractForm_) {
      this.applyViewModelToContract(this.editingContract, this.contractForm_);
      // ... API call
    }
  }
}
```

**HTML Template:**
```html
@if (contractForm_) {
  <app-time-input
    [(value)]="contractForm_.internalGuaranteedHours"
    [disabled]="isDisabled()"
  />

  <input
    [(ngModel)]="contractForm_.internalValidFrom"
    ngbDatepicker
  />
}
```

---

## Entscheidungshilfe: Welches Pattern?

| Situation | Pattern |
|-----------|---------|
| Ein einzelnes Datum in einer Entity | Getter/Setter Property |
| Mehrere Datumsfelder in einer Entity | Getter/Setter Properties |
| Datum in Array-Elementen | Getter/Setter Methoden |
| Komplexes Formular (Datum + Zeit) | ViewModel-Interface |
| Nur OwnTime ohne Datum | Getter/Setter oder ViewModel |

---

## Komponenten mit implementiertem Pattern

### NgbDateStruct Getter/Setter:
- `membership.component.ts` - validFrom, validUntil
- `client-groups.component.ts` - validFrom, validUntil (Methoden für Listen)
- `edit-group-item.component.ts` - validFrom, validUntil
- `edit-group-nav.component.ts` - scopeFrom, scopeUntil
- `edit-shift-nav.component.ts` - scopeFrom, scopeUntil

### OwnTime + NgbDateStruct ViewModel:
- `contracts.component.ts` - ContractFormViewModel

---

## Wichtige Regeln

1. **Domain Models** (`src/app/domain/models/`) enthalten nur native Typen
2. **UI-Typen** (`NgbDateStruct`, `OwnTime`) nur in Presentation Layer
3. **Konvertierung** immer über Helper-Funktionen
4. **Setter** müssen prüfen ob value existiert bevor sie setzen
5. **Tests** verwenden native Typen (Date, number), keine UI-Typen

---

## Migration bestehender Code

Falls `internal*` Properties im Domain Model gefunden werden:

1. Property aus Interface/Class entfernen
2. Getter/Setter in Component hinzufügen
3. HTML Template auf neuen Property-Namen ändern
4. Tests anpassen (keine `internal*` in Mock-Daten)
