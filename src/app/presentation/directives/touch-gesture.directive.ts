// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Translates single-finger (or pen) gestures on a canvas host into the mouse vocabulary the existing
 * grid handlers understand. The host predicate decides at pointerdown whether the finger sits on
 * content that can be manipulated (the current selection, a bar, a fill handle): if it does, the
 * gesture is replayed one to one as mousemove+mousedown and every further move as
 * mousemove(buttons=1), which keeps the existing press-and-hold timings of rubber-band, fill-handle
 * and move-drag intact; if it does not, a short press is replayed as a tap and a longer movement is
 * emitted as pan deltas for the host to scroll with. Mouse pointers are ignored entirely.
 * A contextmenu on the host - the native one of Windows and Android or the synthetic one of
 * LongPressContextDirective - aborts the running gesture without a closing mouseup, because the
 * openers already drop their drag state when they open the menu and a trailing mouseup would move
 * the selection underneath the menu that just opened.
 * @param touchDragPredicate - Host callback deciding whether the pointer starts on manipulable content
 * @param touchPan - Emits the pixel delta since the previous move while panning
 */
import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { isSecondaryPointer, isTouchLikePointer } from 'src/app/shared/helpers/context-click.helper';
import { createSyntheticMouseEvent } from 'src/app/shared/helpers/synthetic-mouse-event.helper';

export interface TouchPanEvent {
  dx: number;
  dy: number;
}

type GesturePhase = 'idle' | 'pending' | 'panning' | 'dragging';

const PRIMARY_BUTTON = 0;
const BUTTONS_NONE = 0;
const BUTTONS_PRIMARY = 1;
const MOUSE_MOVE = 'mousemove';
const MOUSE_DOWN = 'mousedown';
const MOUSE_UP = 'mouseup';
const CONTEXTMENU_EVENT = 'contextmenu';

@Directive({
  selector: '[appTouchGesture]',
  standalone: true,
})
export class TouchGestureDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly touchDragPredicate = input<(event: PointerEvent) => boolean>(() => false);
  readonly touchPan = output<TouchPanEvent>();

  private phase: GesturePhase = 'idle';
  private pointerId: number | null = null;
  private startEvent: PointerEvent | null = null;
  private startedAt = 0;
  private lastX = 0;
  private lastY = 0;

  constructor() {
    const host = this.el.nativeElement;
    host.addEventListener('pointerdown', this.onPointerDown, { capture: true, passive: false });
    host.addEventListener(CONTEXTMENU_EVENT, this.onContextMenu, true);
    this.destroyRef.onDestroy(() => {
      host.removeEventListener('pointerdown', this.onPointerDown, true);
      host.removeEventListener(CONTEXTMENU_EVENT, this.onContextMenu, true);
      this.reset();
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!isTouchLikePointer(event) || !event.isPrimary || event.button !== PRIMARY_BUTTON) {
      return;
    }
    if (isSecondaryPointer(event)) {
      return;
    }
    if (TouchInteraction.PreventDefaultOnPointerDown) {
      event.preventDefault();
    }
    this.reset();
    this.pointerId = event.pointerId;
    this.startEvent = event;
    this.startedAt = Date.now();
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    document.addEventListener('pointermove', this.onPointerMove, true);
    document.addEventListener('pointerup', this.onPointerUp, true);
    document.addEventListener('pointercancel', this.onPointerCancel, true);

    if (this.touchDragPredicate()(event)) {
      this.phase = 'dragging';
      this.dispatch(MOUSE_MOVE, event, BUTTONS_NONE);
      this.dispatch(MOUSE_DOWN, event, BUTTONS_PRIMARY);
      return;
    }
    this.phase = 'pending';
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || !this.startEvent) {
      return;
    }
    if (this.phase === 'pending') {
      if (!this.exceedsTolerance(event)) {
        return;
      }
      this.phase = 'panning';
    }
    if (this.phase === 'dragging') {
      this.dispatch(MOUSE_MOVE, event, BUTTONS_PRIMARY);
    } else if (this.phase === 'panning') {
      this.touchPan.emit({ dx: event.clientX - this.lastX, dy: event.clientY - this.lastY });
    }
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || !this.startEvent) {
      return;
    }
    const heldMs = Date.now() - this.startedAt;
    if (this.phase === 'dragging') {
      this.dispatch(MOUSE_UP, event, BUTTONS_NONE);
    } else if (this.phase === 'pending' && heldMs < TouchInteraction.LongPressMs) {
      this.dispatch(MOUSE_MOVE, event, BUTTONS_NONE);
      this.dispatch(MOUSE_DOWN, event, BUTTONS_PRIMARY);
      this.dispatch(MOUSE_UP, event, BUTTONS_NONE);
    }
    this.reset();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    if (this.phase === 'dragging') {
      this.dispatch(MOUSE_UP, event, BUTTONS_NONE);
    }
    this.reset();
  };

  private readonly onContextMenu = (): void => {
    if (this.phase === 'idle') {
      return;
    }
    this.reset();
  };

  private dispatch(type: string, source: PointerEvent, buttons: number): void {
    this.el.nativeElement.dispatchEvent(createSyntheticMouseEvent(type, source, buttons));
  }

  private exceedsTolerance(event: PointerEvent): boolean {
    if (!this.startEvent) {
      return false;
    }
    const dx = event.clientX - this.startEvent.clientX;
    const dy = event.clientY - this.startEvent.clientY;
    return Math.hypot(dx, dy) > TouchInteraction.MoveTolerancePx;
  }

  private reset(): void {
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('pointerup', this.onPointerUp, true);
    document.removeEventListener('pointercancel', this.onPointerCancel, true);
    this.phase = 'idle';
    this.pointerId = null;
    this.startEvent = null;
  }
}
