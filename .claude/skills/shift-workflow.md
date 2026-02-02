# Shift (Dienst) Workflow

## Wichtigste Regel

**NUR Dienste mit Status `OriginalShift` (2) oder `SplitShift` (3) können verplant werden!**

## Status-Definitionen

```csharp
public enum ShiftStatus
{
    OriginalOrder = 0,   // Nicht verplanbar - Editierbare Bestellung
    SealedOrder = 1,     // Trigger für Kopie-Erstellung
    OriginalShift = 2,   // Verplanbar - 1:1 Kopie
    SplitShift = 3       // Verplanbar - Zerteilter Dienst
}
```

## Workflow

```
OriginalOrder (0)
    | User klickt "Lock"-Button
    v
SealedOrder (1) [bleibt permanent]
    | Backend erstellt automatisch Kopie
    v
OriginalShift (2) [verplanbar]
    | Optional: User zerteilt
    v
SplitShift (3) [verplanbar]
```

**KRITISCH:** Beim Zerteilen wird OriginalShift zu SplitShift umgewandelt (Status 2 -> 3).

## Backend: CreateShiftFromOrderService

```csharp
public async Task<Shift> CreateFromSealedOrder(Shift sealedOrder) {
    // Prüfe ob bereits Kopie existiert
    await _shiftValidator.EnsureNoOriginalShiftCopyExists(originalShiftId);

    // Erstelle 1:1 Kopie
    var cutOriginalShift = _mapper.Map<Shift>(originalShift);
    cutOriginalShift.Status = ShiftStatus.OriginalShift;
    cutOriginalShift.OriginalId = originalShiftId;

    await _shiftRepository.Add(cutOriginalShift);
}
```

## Batch Cutting (2-Phase Ansatz)

**Phase 1:** Hierarchie-Relationen setzen (parentId, rootId) + Speichern
**Phase 2:** Nested Set Werte (lft, rgt) für gesamten Tree neu berechnen

### Frontend: batchCuts()

```typescript
const operations = [
  { type: "UPDATE", parentId: originalShiftId, data: modifiedShift },
  { type: "CREATE", parentId: originalShiftId, data: newCut1 },
  { type: "CREATE", parentId: originalShiftId, data: newCut2 }
];
dataShiftCutsService.batchCuts(operations);
```

### Backend: SetHierarchyRelation()

```csharp
public void SetHierarchyRelation(Shift shift, Guid? parentId, Guid? parentRootId) {
    if (parentId == null) {
        // EBENE 0: Root-Node
        shift.ParentId = null;
        shift.RootId = shift.Id;
    } else {
        // EBENE > 0: Child-Node
        shift.ParentId = parentId;
        shift.RootId = parentRootId ?? parentId.Value;
    }
    shift.Lft = null;  // Wird in Phase 2 berechnet
    shift.Rgt = null;
}
```

## Resultat nach Zerteilen

| ID | Status | rootId | lft | rgt |
|----|--------|--------|-----|-----|
| SealedOrder | 1 | NULL | NULL | NULL | (soft-deleted)
| Cut 1 | 3 | selbst | 1 | 2 |
| Cut 2 | 3 | selbst | 1 | 2 |
| Cut 3 | 3 | selbst | 1 | 2 |

## CuttingAfterMidnight Regel

Für Nachtschichten die über Mitternacht gehen:
- StartTime VOR Mitternacht (z.B. 22:00)
- EndTime NACH Mitternacht (z.B. 06:00)
- Spezielle Logik für entry_date Berechnung

## Dateien

**Backend:**
- `CreateShiftFromOrderService.cs`
- `ShiftTreeService.cs`
- `PostBatchCutsCommandHandler.cs`

**Frontend:**
- `cut-shift-list.component.ts`
- `data-shift-cuts.service.ts`
