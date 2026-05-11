// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  ScheduleCellDragDropService,
  ScheduleCellDragSource,
} from './schedule-cell-drag-drop.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

let settings: BaseSettingsService;

const buildSource = (overrides: Partial<ScheduleCellDragSource> = {}): ScheduleCellDragSource => ({
  row: 0,
  column: 0,
  clientId: 'client-source',
  date: new Date(2026, 4, 11),
  id: 'entry-id',
  sourceId: 'source-id',
  entryId: 'shift-id',
  entryType: WorkScheduleEntryType.Work,
  abbreviation: 'F',
  startTime: '06:00:00',
  endTime: '14:00:00',
  startX: 100,
  startY: 200,
  cellWidth: settings.cellWidth,
  cellHeight: settings.cellHeight,
  snapshotDataUrl: null,
  ...overrides,
});

describe('ScheduleCellDragDropService', () => {
  let service: ScheduleCellDragDropService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 11, 12, 0, 0));
    TestBed.configureTestingModule({
      providers: [
        ScheduleCellDragDropService,
        BaseSettingsService,
        { provide: GridFontsService, useValue: {} },
      ],
    });
    settings = TestBed.inject(BaseSettingsService);
    service = TestBed.inject(ScheduleCellDragDropService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number): void => {
    vi.setSystemTime(Date.now() + ms);
  };

  it('starts in idle state', () => {
    expect(service.isPending()).toBe(false);
    expect(service.isDragging()).toBe(false);
    expect(service.source()).toBeNull();
  });

  it('tryPrepareDrag sets pending state with given source', () => {
    const source = buildSource();
    service.tryPrepareDrag(source);

    expect(service.isPending()).toBe(true);
    expect(service.isDragging()).toBe(false);
    expect(service.source()).toEqual(source);
    expect(service.currentY()).toBe(source.startY);
  });

  it('tryStartFromMove returns false below 5px threshold', () => {
    service.tryPrepareDrag(buildSource({ startX: 100, startY: 200 }));
    advance(400);

    const started = service.tryStartFromMove(102, 203);

    expect(started).toBe(false);
    expect(service.isDragging()).toBe(false);
    expect(service.isPending()).toBe(true);
  });

  it('tryStartFromMove returns true when threshold met AND hold time elapsed', () => {
    service.tryPrepareDrag(buildSource({ startX: 100, startY: 200 }));
    advance(400);

    const started = service.tryStartFromMove(100, 210);

    expect(started).toBe(true);
    expect(service.isDragging()).toBe(true);
    expect(service.isPending()).toBe(false);
    expect(service.currentY()).toBe(210);
  });

  it('tryStartFromMove with fast movement before hold time cancels pending (multi-select wins)', () => {
    service.tryPrepareDrag(buildSource({ startX: 100, startY: 200 }));

    const started = service.tryStartFromMove(100, 210);

    expect(started).toBe(false);
    expect(service.isPending()).toBe(false);
    expect(service.isDragging()).toBe(false);
    expect(service.source()).toBeNull();
  });

  it('updateDragPosition stores only Y while dragging', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);

    service.updateDragPosition(300);

    expect(service.currentY()).toBe(300);
  });

  it('updateDragPosition is a no-op when not dragging', () => {
    service.tryPrepareDrag(buildSource({ startY: 200 }));

    service.updateDragPosition(400);

    expect(service.currentY()).toBe(200);
  });

  it('endDrag returns delete when not over table', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(false);

    const result = service.endDrag();

    expect(result?.action).toBe('delete');
    expect(service.isDragging()).toBe(false);
  });

  it('endDrag returns move when over table on different client with empty target', () => {
    service.tryPrepareDrag(buildSource({ clientId: 'client-source' }));
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(true);
    service.setMoveTarget(7, 'client-target', true);

    const result = service.endDrag();

    expect(result?.action).toBe('move');
    expect(result?.targetClientId).toBe('client-target');
    expect(result?.targetRow).toBe(7);
  });

  it('endDrag returns cancel when over table but not valid (same client / occupied)', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(true);
    service.setMoveTarget(3, 'client-target', false);

    const result = service.endDrag();

    expect(result?.action).toBe('cancel');
  });

  it('setOverTable(false) clears move target', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(true);
    service.setMoveTarget(3, 'x', true);

    service.setOverTable(false);

    expect(service.targetRow()).toBeNull();
    expect(service.targetClientId()).toBeNull();
    expect(service.isValidMove()).toBe(false);
  });

  it('cancelPending resets pending state but never resets active drag', () => {
    service.tryPrepareDrag(buildSource());
    service.cancelPending();
    expect(service.isPending()).toBe(false);
    expect(service.source()).toBeNull();

    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.cancelPending();
    expect(service.isDragging()).toBe(true);
  });

  it('cancelDrag resets everything', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.cancelDrag();

    expect(service.isDragging()).toBe(false);
    expect(service.isPending()).toBe(false);
    expect(service.source()).toBeNull();
  });

  it('showDeleteIndicator true while dragging outside table', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    expect(service.showDeleteIndicator()).toBe(true);

    service.setOverTable(true);
    expect(service.showDeleteIndicator()).toBe(false);
  });

  it('showMoveIndicator true only when over table with valid move', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(true);
    service.setMoveTarget(3, 'other', true);

    expect(service.showMoveIndicator()).toBe(true);
    expect(service.showSnapBackIndicator()).toBe(false);
  });

  it('showSnapBackIndicator true when over table with invalid target', () => {
    service.tryPrepareDrag(buildSource());
    advance(400);
    service.tryStartFromMove(150, 260);
    service.setOverTable(true);
    service.setMoveTarget(3, 'other', false);

    expect(service.showSnapBackIndicator()).toBe(true);
    expect(service.showMoveIndicator()).toBe(false);
  });
});
