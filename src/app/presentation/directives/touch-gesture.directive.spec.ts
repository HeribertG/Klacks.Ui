// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { TouchGestureDirective, TouchPanEvent } from './touch-gesture.directive';

@Component({
  standalone: true,
  imports: [TouchGestureDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas
    appTouchGesture
    [touchDragPredicate]="predicate"
    (touchPan)="pans.push($event)"
  ></canvas>`,
})
class HostComponent {
  pans: TouchPanEvent[] = [];
  onSelection = false;
  readonly predicate = (): boolean => this.onSelection;
}

const pointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    pointerId: 7,
    pointerType: 'touch',
    ...init,
  });

describe('TouchGestureDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canvas: HTMLCanvasElement;
  let mouseLog: string[];

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    mouseLog = [];
    for (const type of ['mousemove', 'mousedown', 'mouseup']) {
      canvas.addEventListener(type, (event) =>
        mouseLog.push(`${type}:${(event as MouseEvent).buttons}`),
      );
    }
  });

  afterEach(() => vi.useRealTimers());

  it('cancels the default of a touch pointerdown so no compatibility mouse events are generated', () => {
    const down = pointer('pointerdown', { clientX: 10, clientY: 10 });

    canvas.dispatchEvent(down);

    expect(down.defaultPrevented).toBe(TouchInteraction.PreventDefaultOnPointerDown);
  });

  it('ignores mouse pointers entirely', () => {
    const down = pointer('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 10 });

    canvas.dispatchEvent(down);
    document.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', clientX: 10, clientY: 10 }));

    expect(down.defaultPrevented).toBe(false);
    expect(mouseLog).toEqual([]);
  });

  it('ignores a pen barrel-button press: no pan, no replayed mouse events', () => {
    const down = pointer('pointerdown', { pointerType: 'pen', button: 2, buttons: 2, clientX: 10, clientY: 10 });
    canvas.dispatchEvent(down);
    document.dispatchEvent(pointer('pointermove', { pointerType: 'pen', buttons: 2, clientX: 10, clientY: 60 }));
    document.dispatchEvent(pointer('pointerup', { pointerType: 'pen', clientX: 10, clientY: 60 }));

    expect(down.defaultPrevented).toBe(false);
    expect(mouseLog).toEqual([]);
  });

  it('ignores a secondary finger of a multi-touch gesture', () => {
    canvas.dispatchEvent(
      pointer('pointerdown', { isPrimary: false, pointerId: 9, clientX: 10, clientY: 10 }),
    );
    document.dispatchEvent(pointer('pointerup', { pointerId: 9, clientX: 10, clientY: 10 }));

    expect(mouseLog).toEqual([]);
  });

  it('replays a short tap off the selection as mousemove + mousedown + mouseup', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    vi.advanceTimersByTime(100);
    document.dispatchEvent(pointer('pointerup', { clientX: 12, clientY: 11 }));

    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1', 'mouseup:0']);
    expect(fixture.componentInstance.pans).toEqual([]);
  });

  it('emits pan deltas instead of mouse events when the drag starts off the selection', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 130 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 130 }));

    expect(fixture.componentInstance.pans).toEqual([{ dx: 0, dy: 30 }]);
    expect(mouseLog).toEqual([]);
  });

  it('presses the mouse down at pointerdown when the pointer starts on the selection, so the existing hold timings still apply', () => {
    fixture.componentInstance.onSelection = true;

    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));

    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1']);
  });

  it('replays a drag from the selection as mousedown + mousemove(buttons=1) + mouseup', () => {
    fixture.componentInstance.onSelection = true;

    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 130 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 130 }));

    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1', 'mousemove:1', 'mouseup:0']);
    expect(fixture.componentInstance.pans).toEqual([]);
  });

  it('does not replay a tap when the finger was held for the long-press duration', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(pointer('pointerup', { clientX: 10, clientY: 10 }));

    expect(mouseLog).toEqual([]);
  });

  it('does not treat sub-tolerance movement as a pan', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 14, clientY: 12 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 14, clientY: 12 }));

    expect(fixture.componentInstance.pans).toEqual([]);
    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1', 'mouseup:0']);
  });

  it('releases the mouse when the browser cancels the gesture mid-drag', () => {
    fixture.componentInstance.onSelection = true;

    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(pointer('pointercancel', { clientX: 100, clientY: 100 }));

    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1', 'mouseup:0']);
  });

  it('abandons a drag when a contextmenu opens, without a closing mouseup', () => {
    fixture.componentInstance.onSelection = true;

    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 140 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 140 }));

    expect(mouseLog).toEqual(['mousemove:0', 'mousedown:1']);
    expect(fixture.componentInstance.pans).toEqual([]);
  });

  it('abandons a pending gesture when a contextmenu opens, so no tap is replayed afterwards', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.dispatchEvent(pointer('pointerup', { clientX: 10, clientY: 10 }));

    expect(mouseLog).toEqual([]);
  });

  it('ignores moves that belong to a different pointer', () => {
    canvas.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(pointer('pointermove', { pointerId: 8, clientX: 100, clientY: 200 }));

    expect(fixture.componentInstance.pans).toEqual([]);
  });
});
