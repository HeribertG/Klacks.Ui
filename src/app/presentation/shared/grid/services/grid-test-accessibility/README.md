# Grid Test Accessibility

Test accessibility system for the Schedule Grid. Enables E2E testing (Playwright) for the Canvas-based grid.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CANVAS GRID                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Canvas (rendered cells)                            │   │
│  │  ┌─────┬─────┬─────┐                               │   │
│  │  │ A   │ B   │ C   │  ← Rendered on Canvas         │   │
│  │  └─────┴─────┴─────┘                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           +                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ghost DOM (non-editable cells only)                │   │
│  │  ┌─────┐         ┌─────┐                           │   │
│  │  │ div │         │ div │  ← data-testid="cell-x-y" │   │
│  │  └─────┘         └─────┘                           │   │
│  │  [Header]         [Work Entry]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           +                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HTML Input (editable cells only)                   │   │
│  │  ┌─────────┐                                        │   │
│  │  │ <input> │  ← data-testid="cell-input"            │   │
│  │  └─────────┘                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `test-accessibility.service.ts` | Core service exposing `window.klacksScheduleGrid` API |
| `grid-test-accessibility.service.ts` | Schedule Grid specific implementation |
| `test-accessibility.service.spec.ts` | Unit tests for the accessibility service |

## Window API

When test mode is enabled (`?testMode` URL parameter), `window.klacksScheduleGrid` is available:

```typescript
// Get cell metadata
const cell = await page.evaluate(() => {
  return window.klacksScheduleGrid.getCellAt(2, 3);
});

// Find cells
const cells = await page.evaluate(() => {
  return window.klacksScheduleGrid.findCellsByClient('client-123');
});

// Select cell
await page.evaluate(() => {
  window.klacksScheduleGrid.selectCell(2, 3);
});

// Scroll to row
await page.evaluate(() => {
  window.klacksScheduleGrid.scrollToRow(10);
});
```

## Activation

Test mode is automatically enabled when:
- URL contains `?testMode` parameter
- `window.Cypress` is defined (Cypress tests)
- `window.__PLAYWRIGHT__` is defined (Playwright tests)

## Selectors

### Ghost DOM (non-editable cells)
```typescript
// By coordinates
page.locator('[data-testid="cell-2-3"]')

// By client and date
page.locator('[data-client-id="client-123"][data-date="2024-02-15"]')
```

### Input Overlay (editable cells)
```typescript
// Active input
page.locator('[data-testid="cell-input"]')
```
