// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Turns a touch or pen long press on the host into a synthetic `contextmenu` PointerEvent, so every
 * existing `(contextmenu)` opener keeps working on tablets whose browser never emits a native one.
 * Three browser assumptions are deliberately kept inside this directive instead of being spread over
 * the call sites: (1) some platforms (Windows touch, Android) emit a native `contextmenu` while the
 * finger is still down - such an event wins, cancels the timer and prevents a second menu;
 * (2) after a long press the browser emits trailing compatibility events (`contextmenu`, `mousedown`,
 * `mouseup`, `click`) that would reopen or immediately close the menu - they are swallowed for
 * `SuppressAfterLongPressMs` measured from the moment the finger lifts; (3) events this application
 * dispatches itself are never swallowed, which is what keeps the replayed gestures of
 * `TouchGestureDirective` alive inside the same window.
 * A host may veto the long press for a single gesture through `longPressSuppressPredicate`, evaluated at
 * pointerdown: when it returns true (for example on a resize grip that must win over the menu), no timer
 * is started and a native contextmenu that the browser emits while that finger is down is swallowed too.
 * @param longPressMs - Hold duration before the synthetic contextmenu is dispatched
 * @param longPressSuppressPredicate - Host callback that vetoes the long press for the gesture starting at this pointer
 */
import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { isSecondaryPointer, isTouchLikePointer } from 'src/app/shared/helpers/context-click.helper';
import {
  isSyntheticEvent,
  markSyntheticEvent,
} from 'src/app/shared/helpers/synthetic-event-registry';

const CONTEXTMENU_EVENT = 'contextmenu';
const SUPPRESSED_EVENT_TYPES = [CONTEXTMENU_EVENT, 'mousedown', 'mouseup', 'click'] as const;
const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;
const BUTTONS_NONE = 0;

@Directive({
  selector: '[appLongPressContext]',
  standalone: true,
})
export class LongPressContextDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly longPressMs = input<number>(TouchInteraction.LongPressMs);
  readonly longPressSuppressPredicate = input<(event: PointerEvent) => boolean>(() => false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private pointerId: number | null = null;
  private pointerType = '';
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private suppressUntil = 0;
  private hasOpenedMenu = false;
  private isGestureSuppressed = false;

  constructor() {
    const host = this.el.nativeElement;
    host.addEventListener('pointerdown', this.onPointerDown, { capture: true, passive: true });
    for (const type of SUPPRESSED_EVENT_TYPES) {
      host.addEventListener(type, this.onSuppressible, true);
    }
    this.destroyRef.onDestroy(() => {
      host.removeEventListener('pointerdown', this.onPointerDown, true);
      for (const type of SUPPRESSED_EVENT_TYPES) {
        host.removeEventListener(type, this.onSuppressible, true);
      }
      this.cancelTimer();
      this.removeDocumentListeners();
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!isTouchLikePointer(event) || !event.isPrimary || event.button !== PRIMARY_BUTTON) {
      return;
    }
    if (isSecondaryPointer(event)) {
      return;
    }
    this.cancelTimer();
    this.removeDocumentListeners();
    this.hasOpenedMenu = false;
    this.isGestureSuppressed = this.longPressSuppressPredicate()(event);
    this.pointerId = event.pointerId;
    this.pointerType = event.pointerType;
    this.startX = this.lastX = event.clientX;
    this.startY = this.lastY = event.clientY;
    document.addEventListener('pointermove', this.onPointerMove, true);
    document.addEventListener('pointerup', this.onPointerEnd, true);
    document.addEventListener('pointercancel', this.onPointerEnd, true);
    if (!this.isGestureSuppressed) {
      this.timer = setTimeout(() => this.fire(), this.longPressMs());
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    const moved = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);
    if (moved > TouchInteraction.MoveTolerancePx) {
      this.cancelTimer();
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    if (this.hasOpenedMenu) {
      this.openSuppressionWindow();
    }
    this.cancelTimer();
    this.removeDocumentListeners();
    this.isGestureSuppressed = false;
    this.pointerId = null;
  };

  private readonly onSuppressible = (event: Event): void => {
    if (isSyntheticEvent(event)) {
      return;
    }
    if (event.type === CONTEXTMENU_EVENT && this.isGestureSuppressed) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.type === CONTEXTMENU_EVENT && this.timer !== null) {
      this.cancelTimer();
      this.hasOpenedMenu = true;
      this.openSuppressionWindow();
      return;
    }
    if (Date.now() < this.suppressUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private fire(): void {
    this.timer = null;
    const event = markSyntheticEvent(
      new PointerEvent(CONTEXTMENU_EVENT, {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: SECONDARY_BUTTON,
        buttons: BUTTONS_NONE,
        clientX: this.lastX,
        clientY: this.lastY,
        pointerId: this.pointerId ?? 0,
        pointerType: this.pointerType,
        isPrimary: true,
      }),
    );
    this.hasOpenedMenu = true;
    this.openSuppressionWindow();
    this.el.nativeElement.dispatchEvent(event);
  }

  private openSuppressionWindow(): void {
    this.suppressUntil = Date.now() + TouchInteraction.SuppressAfterLongPressMs;
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private removeDocumentListeners(): void {
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('pointerup', this.onPointerEnd, true);
    document.removeEventListener('pointercancel', this.onPointerEnd, true);
  }
}
