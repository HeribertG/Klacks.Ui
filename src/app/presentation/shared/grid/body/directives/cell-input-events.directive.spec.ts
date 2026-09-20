// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CellInputEventsDirective, CellInputRightClickEvent } from './cell-input-events.directive';
import { LongPressContextDirective } from 'src/app/presentation/directives/long-press-context.directive';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

@Component({
  standalone: true,
  imports: [CellInputEventsDirective, LongPressContextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    appCellInputEvents
    appLongPressContext
    type="text"
    (rightClick)="rightClicks.push($event)"
  />`,
})
class HostComponent {
  rightClicks: CellInputRightClickEvent[] = [];
}

const touchPointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    pointerId: 6,
    pointerType: 'touch',
    clientX: 200,
    clientY: 300,
    ...init,
  });

describe('CellInputEventsDirective - long press opens the context menu', () => {
  let fixture: ComponentFixture<HostComponent>;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  afterEach(() => vi.useRealTimers());

  it('emits rightClick with the finger position after the long-press duration', () => {
    inputEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(fixture.componentInstance.rightClicks).toEqual([{ clientX: 200, clientY: 300 }]);
  });

  it('emits rightClick only once when the browser adds its own contextmenu afterwards', () => {
    inputEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(touchPointer('pointerup'));
    inputEl.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
    );

    expect(fixture.componentInstance.rightClicks).toHaveLength(1);
  });

  it('keeps the mouse right-click path untouched', () => {
    inputEl.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: 11,
        clientY: 22,
      }),
    );

    expect(fixture.componentInstance.rightClicks).toEqual([{ clientX: 11, clientY: 22 }]);
  });
});
