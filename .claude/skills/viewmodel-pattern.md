---
name: viewmodel-pattern
description: Verwende wenn ViewModel-Konvertierungen zwischen Domain-Typen und UI-Typen (NgbDateStruct, OwnTime) implementiert werden
---

# ViewModel-Pattern für UI-spezifische Typen

## Prinzip

Domain Models dürfen keine UI-Framework-spezifischen Typen enthalten (DDD).
Konvertierung erfolgt in Presentation Layer mit Getter/Settern.

## Betroffene Typen

| UI-Typ | Domain-Typ | Verwendung |
|--------|------------|------------|
| `NgbDateStruct` | `Date` | ng-bootstrap Datepicker |
| `OwnTime` | `number` (Minuten) | Zeit-Eingabefelder |

## Pattern 1: NgbDateStruct - Date

### Helper-Funktionen

```typescript
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate
} from 'src/app/shared/helpers/ngb-date.helper';
```

### Einzelnes Datum (Getter/Setter)

```typescript
get internalValidFrom(): NgbDateStruct | undefined {
  const date = this.dataService.editClient()?.membership?.validFrom;
  return date ? transformDateToNgbDateStruct(date) : undefined;
}

set internalValidFrom(value: NgbDateStruct | undefined) {
  const client = this.dataService.editClient();
  if (client?.membership && value) {
    client.membership.validFrom = transformNgbDateStructToDate(value);
  }
}
```

### Listen-Elemente (Methoden)

```typescript
getContractFromDate(contract: IClientContract): NgbDateStruct | undefined {
  return contract.fromDate
    ? transformDateToNgbDateStruct(contract.fromDate)
    : undefined;
}

setContractFromDate(contract: IClientContract, value: NgbDateStruct | undefined): void {
  if (value) {
    contract.fromDate = transformNgbDateStructToDate(value);
  }
}
```

```html
<input
  [ngModel]="getContractFromDate(contract)"
  (ngModelChange)="setContractFromDate(contract, $event)"
  ngbDatepicker
/>
```

## Pattern 2: OwnTime - Dezimal-Stunden

### Konvertierung

```typescript
import {
  transformNumberToOwnTime,
  transformOwnTimeToNumber
} from 'src/app/domain/helpers/own-time.helper';

// Dezimal -> OwnTime (160.5 -> hours:"160", minutes:"30")
transformNumberToOwnTime(160.5, true)

// OwnTime -> Dezimal (160 + 30/60 = 160.5)
transformOwnTimeToNumber(ownTime)
```

### ViewModel-Interface

```typescript
interface ContractFormViewModel {
  internalGuaranteedHours: OwnTime;
  internalMinimumHours: OwnTime;
  internalValidFrom: NgbDateStruct | undefined;
}

onClickEdit(contract: IContract): void {
  this.contractForm_ = {
    internalGuaranteedHours: transformNumberToOwnTime(contract.guaranteedHoursPerMonth ?? 0, true),
    internalValidFrom: contract.validFrom
      ? transformDateToNgbDateStruct(contract.validFrom)
      : undefined,
  };
}

onSave(): void {
  contract.guaranteedHoursPerMonth = transformOwnTimeToNumber(this.contractForm_.internalGuaranteedHours);
  contract.validFrom = this.contractForm_.internalValidFrom
    ? transformNgbDateStructToDate(this.contractForm_.internalValidFrom)
    : undefined;
}
```

## Entscheidungshilfe

| Situation | Pattern |
|-----------|---------|
| Ein einzelnes Datum | Getter/Setter Property |
| Datum in Array-Elementen | Getter/Setter Methoden |
| Komplexes Formular | ViewModel-Interface |

## Wichtige Regeln

1. **Domain Models** nur native Typen
2. **UI-Typen** nur in Presentation Layer
3. **Konvertierung** über Helper-Funktionen
4. **Setter** prüfen ob value existiert
5. **Tests** verwenden native Typen
