// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineGridEventsDirective } from './timeline-grid-events.directive';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { TimelineBlockHitTestService } from '../services/timeline-block-hit-test.service';
import { TimelineBlockTooltipService } from '../services/timeline-block-tooltip.service';
import { TimelineSelectionService } from '../services/timeline-selection.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

const createMouseEvent = (
  type: string,
  init: Partial<MouseEvent> = {}
): MouseEvent =>
  new MouseEvent(type, { bubbles: true, cancelable: true, ...init });

describe('TimelineGridEventsDirective - Safari right-click via contextmenu', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let canvasEl: HTMLElement;
  let drawSchedule: any;
  let selection: any;
  let hitTest: any;

  @Component({
    standalone: true,
    imports: [TimelineGridEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appTimelineGridEvents (rightClick)="onRightClick($event)"></canvas>`,
  })
  class TestHostComponent {
    rightClickEvent: unknown = null;
    onRightClick(event: unknown): void {
      this.rightClickEvent = event;
    }
  }

  beforeEach(async () => {
    const targetPos = new MyPosition(3, 4);

    drawSchedule = {
      calcCorrectCoordinate: vi.fn().mockReturnValue(targetPos),
      isPositionValid: vi.fn().mockReturnValue(true),
      refresh: vi.fn(),
    };

    hitTest = { hitTest: vi.fn().mockReturnValue(null) };
    selection = {
      selectBlock: vi.fn(),
      clearBlock: vi.fn(),
      selectedBlock: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: BaseDrawScheduleService, useValue: drawSchedule },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, Position: null } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20 } },
        { provide: BaseDataService, useValue: { columns: 10, isCellActive: vi.fn().mockReturnValue(true) } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0 } },
        { provide: TimelineBlockHitTestService, useValue: hitTest },
        { provide: TimelineBlockTooltipService, useValue: { buildBlockTooltip: vi.fn() } },
        { provide: TimelineSelectionService, useValue: selection },
        { provide: DataManagementScheduleService, useValue: { shiftSchedules: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  it('does not emit rightClick from a plain mousedown with buttons=2', () => {
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 2 } as any));

    expect(fixture.componentInstance.rightClickEvent).toBeNull();
  });

  it('emits rightClick from the native contextmenu event', () => {
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 70, clientY: 80 } as any));

    expect(fixture.componentInstance.rightClickEvent).toEqual({
      row: 3,
      column: 4,
      clientX: 70,
      clientY: 80,
      entry: null,
    });
  });

  it('reproduces the Safari Ctrl+Click sequence: mousedown fires as button 0, contextmenu still opens the menu', () => {
    canvasEl.dispatchEvent(
      createMouseEvent('mousedown', { buttons: 1, ctrlKey: true } as any)
    );
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 15, clientY: 25 } as any));

    expect(fixture.componentInstance.rightClickEvent).toEqual({
      row: 3,
      column: 4,
      clientX: 15,
      clientY: 25,
      entry: null,
    });
  });
});
