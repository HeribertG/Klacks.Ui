// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks whether the user currently works with a coarse pointer (finger or pen) so grids and menus
 * can switch to touch-sized hit areas. The initial value comes from the `(pointer: coarse)` media
 * query, afterwards every pointerdown on the document updates the mode from its pointerType. A
 * hybrid device such as a Surface therefore switches back and forth while the app is running.
 * `isFingerMode` is narrower than `isTouchMode`: it is true for a finger only, because a pen is
 * precise enough to keep mouse behaviour such as move-drags.
 */
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  MOUSE_POINTER_TYPE,
  TOUCH_LIKE_POINTER_TYPES,
  TOUCH_POINTER_TYPE,
} from 'src/app/domain/constants/touch-interaction.constants';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

@Injectable({ providedIn: 'root' })
export class InputModalityService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly lastPointerType = signal<string>(readInitialPointerType());

  readonly pointerType = this.lastPointerType.asReadonly();
  readonly isTouchMode = computed(() => TOUCH_LIKE_POINTER_TYPES.has(this.lastPointerType()));
  readonly isFingerMode = computed(() => this.lastPointerType() === TOUCH_POINTER_TYPE);

  constructor() {
    const onPointerDown = (event: PointerEvent): void =>
      this.lastPointerType.set(event.pointerType || MOUSE_POINTER_TYPE);
    const options: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener('pointerdown', onPointerDown, options);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('pointerdown', onPointerDown, options),
    );
  }
}

function readInitialPointerType(): string {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return MOUSE_POINTER_TYPE;
  }
  return window.matchMedia(COARSE_POINTER_QUERY).matches
    ? TOUCH_POINTER_TYPE
    : MOUSE_POINTER_TYPE;
}
