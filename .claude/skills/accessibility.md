# Accessibility (Web Accessibility / A11y)

## WCAG 2.1 Level AA - Hauptziel

### Kritische Probleme (Priorität 1)

1. **Fehlender Keyboard-Support** (WCAG 2.1.1)
   - Click-Events brauchen auch Keyboard-Events
   - Custom Icons in Button-Wrapper mit aria-label

2. **ESLint-Warnings deaktiviert**
   - Alle `eslint-disable` Kommentare entfernen
   - Code-Basis refactoren

3. **Canvas ohne Alternativen** (WCAG 1.1.1)
   - Time Ruler: Text-Alternative + Tabellen-Fallback

4. **Fehlende ARIA-Labels** (WCAG 4.1.2)
   - Buttons, Icons, Inputs labeln

5. **Modals ohne Focus Management** (WCAG 2.4.3)
   - Focus-Trap implementieren
   - Return-Focus nach Schließen

## CSS Hilfsklassen

```scss
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--standartGreenColor);
  color: white;
  padding: 8px 16px;
  z-index: 10000;

  &:focus {
    top: 0;
  }
}
```

## LiveRegionService

```typescript
@Injectable({ providedIn: 'root' })
export class LiveRegionService {
  private messageSource = new Subject<LiveMessage>();
  message$ = this.messageSource.asObservable();

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.messageSource.next({ message, priority });
    setTimeout(() => this.messageSource.next({ message: '', priority }), 1000);
  }

  announceSuccess(message: string): void { this.announce(message, 'polite'); }
  announceError(message: string): void { this.announce(message, 'assertive'); }
}
```

## Focus-Trap Directive

```typescript
@Directive({ selector: '[appFocusTrap]', standalone: true })
export class FocusTrapDirective implements OnInit, AfterViewInit, OnDestroy {
  private focusableElements: HTMLElement[] = [];
  private firstFocusable?: HTMLElement;
  private lastFocusable?: HTMLElement;
  private previousActiveElement?: HTMLElement | null;

  ngAfterViewInit(): void {
    this.updateFocusableElements();
    this.el.nativeElement.addEventListener('keydown', this.trapFocus);
    setTimeout(() => this.firstFocusable?.focus(), 100);
  }

  private trapFocus = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === this.firstFocusable) {
      event.preventDefault();
      this.lastFocusable?.focus();
    } else if (!event.shiftKey && document.activeElement === this.lastFocusable) {
      event.preventDefault();
      this.firstFocusable?.focus();
    }
  };
}
```

## Zugänglicher Button mit Icon

```html
<button
  type="button"
  [attr.aria-label]="ariaLabel | translate"
  (click)="onClick()">
  <fa-icon [icon]="icon" aria-hidden="true"></fa-icon>
  <span class="sr-only">{{ ariaLabel | translate }}</span>
</button>
```

## Zugängliches Input-Feld

```html
<div class="form-group">
  <label [for]="id">
    {{ label | translate }}
    @if (required) {
      <span class="sr-only">{{ 'accessibility.required-field' | translate }}</span>
      <span aria-hidden="true">*</span>
    }
  </label>

  <input
    [id]="id"
    [attr.aria-describedby]="field.invalid && field.touched ? id + '-error' : null"
    [attr.aria-invalid]="field.invalid && field.touched"
  />

  @if (field.invalid && field.touched) {
    <div [id]="id + '-error'" role="alert" aria-live="polite">
      {{ getErrorMessage(field.errors) | translate }}
    </div>
  }
</div>
```

## Zugängliche Tabelle

```html
<table>
  <caption class="sr-only">{{ caption | translate }}</caption>
  <thead>
    <tr>
      <th scope="col" [attr.aria-sort]="getSortDirection('column')">
        {{ header | translate }}
      </th>
    </tr>
  </thead>
</table>
```

## Testing

```bash
# ESLint A11y
npm run lint

# Lighthouse
npx lighthouse http://localhost:4200 --only-categories=accessibility

# axe-core in Unit Tests
npm test
```

### Keyboard-Navigation Checklist

- Tab durch alle interaktiven Elemente
- Shift+Tab rückwärts
- Enter aktiviert Links/Buttons
- Space aktiviert Buttons/Checkboxen
- Escape schließt Modals
- Focus immer sichtbar
- Focus-Trap in Modals
- Skip-Links funktionieren

### Screen-Reader Test (NVDA/VoiceOver)

- Landmarks werden angekündigt
- Labels werden vorgelesen
- Error-Messages werden angekündigt
- Icons haben Text-Alternativen
- Live-Regions funktionieren
