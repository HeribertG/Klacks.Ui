// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongPressContextDirective } from './long-press-context.directive';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { createSyntheticMouseEvent } from 'src/app/shared/helpers/synthetic-mouse-event.helper';

@Component({
  standalone: true,
  imports: [LongPressContextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<!-- eslint-disable @angular-eslint/template/click-events-have-key-events -->
  <!-- eslint-disable @angular-eslint/template/interactive-supports-focus -->
  <div
    appLongPressContext
    [longPressMs]="holdMs"
    [longPressSuppressPredicate]="suppressPredicate"
    (contextmenu)="onContextMenu($event)"
    (click)="clicks = clicks + 1"
    (mousedown)="mouseDowns = mouseDowns + 1"
    (mouseup)="mouseUps = mouseUps + 1"
  ></div>`,
})
class HostComponent {
  holdMs = TouchInteraction.LongPressMs;
  suppressed = false;
  suppressPredicate = (): boolean => this.suppressed;
  received: MouseEvent[] = [];
  clicks = 0;
  mouseDowns = 0;
  mouseUps = 0;

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.received.push(event);
  }
}

const pointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    pointerId: 3,
    pointerType: 'touch',
    clientX: 50,
    clientY: 60,
    ...init,
  });

const mouse = (type: string): MouseEvent =>
  new MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'contextmenu' ? 2 : 0 });

describe('LongPressContextDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    el = fixture.nativeElement.querySelector('div');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches a synthetic contextmenu at the finger position after the long-press duration', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs - 1);
    expect(host.received).toHaveLength(0);

    vi.advanceTimersByTime(1);

    expect(host.received).toHaveLength(1);
    expect(host.received[0]).toBeInstanceOf(PointerEvent);
    expect(host.received[0].button).toBe(2);
    expect(host.received[0].clientX).toBe(50);
    expect(host.received[0].clientY).toBe(60);
    expect((host.received[0] as PointerEvent).pointerType).toBe('touch');
  });

  it('follows the finger inside the tolerance and fires at the last position', () => {
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 54, clientY: 63 }));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(1);
    expect(host.received[0].clientX).toBe(54);
    expect(host.received[0].clientY).toBe(63);
  });

  it('honours a custom hold duration', () => {
    const custom = TestBed.createComponent(HostComponent);
    custom.componentInstance.holdMs = TouchInteraction.LongPressMs * 2;
    custom.detectChanges();
    const customEl: HTMLElement = custom.nativeElement.querySelector('div');

    customEl.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    expect(custom.componentInstance.received).toHaveLength(0);

    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    expect(custom.componentInstance.received).toHaveLength(1);
  });

  it('cancels when the finger moves beyond the tolerance', () => {
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 50 + TouchInteraction.MoveTolerancePx + 1 }),
    );
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(0);
  });

  it('cancels when the finger lifts early', () => {
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointerup'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(0);
  });

  it('cancels when the gesture is cancelled by the browser', () => {
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointercancel'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(0);
  });

  it('ignores a pen barrel-button press so only the native contextmenu opens the menu', () => {
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'pen', button: 2, buttons: 2 }));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(0);
  });

  it('ignores mouse pointers', () => {
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(0);
  });

  it('lets a native contextmenu during the timer win and does not fire a second one', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(100);

    el.dispatchEvent(mouse('contextmenu'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(1);
    expect(host.received[0]).not.toBeInstanceOf(PointerEvent);
  });

  it('swallows the trailing native contextmenu, mouse events and click after firing', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(pointer('pointerup'));

    const trailing = mouse('contextmenu');
    el.dispatchEvent(trailing);
    el.dispatchEvent(mouse('mousedown'));
    el.dispatchEvent(mouse('mouseup'));
    el.dispatchEvent(mouse('click'));

    expect(host.received).toHaveLength(1);
    expect(trailing.defaultPrevented).toBe(true);
    expect(host.clicks).toBe(0);
    expect(host.mouseDowns).toBe(0);
    expect(host.mouseUps).toBe(0);
  });

  it('measures the suppression window from the moment the finger lifts, not from the menu', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    vi.advanceTimersByTime(TouchInteraction.SuppressAfterLongPressMs * 2);
    document.dispatchEvent(pointer('pointerup'));

    el.dispatchEvent(mouse('click'));

    expect(host.clicks).toBe(0);
  });

  it('stops swallowing after the suppression window', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(pointer('pointerup'));
    vi.advanceTimersByTime(TouchInteraction.SuppressAfterLongPressMs + 1);

    el.dispatchEvent(mouse('click'));

    expect(host.clicks).toBe(1);
  });

  it('never swallows the replayed mouse events of the touch gesture directive', () => {
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(pointer('pointerup'));

    const source = pointer('pointerup');
    el.dispatchEvent(createSyntheticMouseEvent('mousedown', source, 1));
    el.dispatchEvent(createSyntheticMouseEvent('mouseup', source, 0));

    expect(host.mouseDowns).toBe(1);
    expect(host.mouseUps).toBe(1);
  });

  it('starts no timer for a gesture the host predicate vetoes, however long the finger rests', () => {
    host.suppressed = true;

    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs * 3);

    expect(host.received).toHaveLength(0);
  });

  it('swallows a native contextmenu that arrives while a vetoed finger is down', () => {
    host.suppressed = true;
    el.dispatchEvent(pointer('pointerdown'));

    const native = mouse('contextmenu');
    el.dispatchEvent(native);

    expect(host.received).toHaveLength(0);
    expect(native.defaultPrevented).toBe(true);
  });

  it('lets the next gesture open a menu after a vetoed one has ended', () => {
    host.suppressed = true;
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointerup'));
    host.suppressed = false;

    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(host.received).toHaveLength(1);
  });

  it('does not swallow a mouse right-click after a vetoed gesture has ended', () => {
    host.suppressed = true;
    el.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointercancel'));

    el.dispatchEvent(mouse('contextmenu'));

    expect(host.received).toHaveLength(1);
  });
});
