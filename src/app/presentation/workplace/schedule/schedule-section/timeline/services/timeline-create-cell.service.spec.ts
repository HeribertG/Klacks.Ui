// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TimelineCreateCellService } from './timeline-create-cell.service';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { ScheduleTimelineRangeService } from '../../../services/schedule-timeline-range.service';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';

describe('TimelineCreateCellService day darkening', () => {
  const outsideMembership = vi.fn();
  const outsideGroupPeriod = vi.fn();

  function createService(): TimelineCreateCellService {
    TestBed.configureTestingModule({
      providers: [
        TimelineCreateCellService,
        {
          provide: ScheduleDataService,
          useValue: {
            isCellOutsideMembershipPeriod: outsideMembership,
            isCellOutsideGroupPeriod: outsideGroupPeriod,
          },
        },
        { provide: TimeRangeService, useValue: { calculateDisplayRange: vi.fn(() => ({ fromMinutes: 0, toMinutes: 1440 })) } },
        { provide: ScheduleTimelineRangeService, useValue: { dayStart: () => 0, dayEnd: () => 1440 } },
        { provide: WorkBlockRendererService, useValue: {} },
        { provide: WorkChangeBlockRendererService, useValue: {} },
        { provide: BreakBlockRendererService, useValue: {} },
        { provide: BaseSettingsService, useValue: { isTimelineMode: true } },
        { provide: BaseDataService, useValue: {} },
        { provide: GridColorService, useValue: {} },
        { provide: GridFontsService, useValue: {} },
        { provide: CellIconsService, useValue: {} },
      ],
    });
    return TestBed.inject(TimelineCreateCellService);
  }

  function sealedCell(sealed: boolean): GridCell {
    return { sealed } as GridCell;
  }

  beforeEach(() => {
    outsideMembership.mockReset().mockReturnValue(false);
    outsideGroupPeriod.mockReset().mockReturnValue(false);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('darkens a day outside the membership period like the grid view', () => {
    // Arrange
    outsideMembership.mockReturnValue(true);
    const service = createService();

    // Act
    const darkened = service['isDayDarkened'](3, 5, sealedCell(true));

    // Assert
    expect(darkened).toBe(true);
    expect(outsideMembership).toHaveBeenCalledWith(3, 5);
  });

  it('darkens a day outside the group period', () => {
    // Arrange
    outsideGroupPeriod.mockReturnValue(true);
    const service = createService();

    // Act & Assert
    expect(service['isDayDarkened'](0, 0, sealedCell(true))).toBe(true);
  });

  it('paints the group-period colour on a day outside the group period like the grid view', () => {
    // Arrange
    outsideGroupPeriod.mockReturnValue(true);
    const service = createService();

    // Act & Assert
    expect(service['shouldDrawCellBackgroundColor'](sealedCell(true), 2, 4)).toBe(true);
    expect(outsideGroupPeriod).toHaveBeenCalledWith(2, 4);
  });

  it('suppresses other cell background fills so the hour stripes stay visible', () => {
    // Arrange
    const service = createService();

    // Act & Assert
    expect(service['shouldDrawCellBackgroundColor'](sealedCell(false), 0, 0)).toBe(false);
  });

  it('keeps the day light for a locked entry inside the membership period', () => {
    // Arrange
    const service = createService();

    // Act & Assert
    expect(service['isDayDarkened'](0, 0, sealedCell(true))).toBe(false);
  });
});

describe('TimelineCreateCellService availability overlay', () => {
  const GREEN = 'rgba(0, 255, 0, 0.15)';
  const RED = 'rgba(255, 0, 0, 0.15)';
  const available = [{ startMinutes: 480, endMinutes: 720 }];
  const blocked = [{ startMinutes: 0, endMinutes: 480 }, { startMinutes: 720, endMinutes: 1440 }];
  const scheduleData = {
    getWorkScheduleForCell: vi.fn(() => []),
    getAvailabilityRangesForCell: vi.fn(() => available),
    getBlockedRangesForCell: vi.fn(() => blocked),
  };

  function createService(): TimelineCreateCellService {
    TestBed.configureTestingModule({
      providers: [
        TimelineCreateCellService,
        { provide: ScheduleDataService, useValue: scheduleData },
        { provide: TimeRangeService, useValue: { calculateDisplayRange: vi.fn(() => ({ fromMinutes: 0, toMinutes: 1440 })) } },
        { provide: ScheduleTimelineRangeService, useValue: { dayStart: () => 0, dayEnd: () => 1440 } },
        { provide: WorkBlockRendererService, useValue: {} },
        { provide: WorkChangeBlockRendererService, useValue: {} },
        { provide: BreakBlockRendererService, useValue: {} },
        { provide: BaseSettingsService, useValue: { isTimelineMode: true } },
        { provide: BaseDataService, useValue: {} },
        { provide: GridColorService, useValue: { availabilityHighlightColor: GREEN, availabilityBlockedHighlightColor: RED } },
        { provide: GridFontsService, useValue: {} },
        { provide: CellIconsService, useValue: {} },
      ],
    });
    return TestBed.inject(TimelineCreateCellService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('collects the blocked ranges of the cell next to the available ones', () => {
    const service = createService();

    const entries = service['collectTimelineEntries'](1, 2);

    expect(entries.availabilityRanges).toEqual(available);
    expect(entries.blockedRanges).toEqual(blocked);
    expect(scheduleData.getBlockedRangesForCell).toHaveBeenCalledWith(1, 2);
  });

  it('still renders a cell that has only blocked ranges', () => {
    const service = createService();

    expect(service['hasNothingToRender']({ todayEntries: [], overflowEntries: [], availabilityRanges: [], blockedRanges: blocked })).toBe(false);
    expect(service['hasNothingToRender']({ todayEntries: [], overflowEntries: [], availabilityRanges: [], blockedRanges: [] })).toBe(true);
  });

  it('tints available ranges green and blocked ranges red', () => {
    const service = createService();
    const fills: { color: string; y: number; h: number }[] = [];
    const ctx = {
      fillStyle: '',
      save: vi.fn(),
      restore: vi.fn(),
      fillRect(this: { fillStyle: string }, _x: number, y: number, _w: number, h: number) {
        fills.push({ color: this.fillStyle, y, h });
      },
    } as unknown as CanvasRenderingContext2D;
    const geometry = { width: 100, height: 1440, pixelsPerMinute: 1, displayFromMinutes: 0 };

    service['drawAvailability'](ctx, available, GREEN, geometry);
    service['drawAvailability'](ctx, blocked, RED, geometry);

    expect(fills).toEqual([
      { color: GREEN, y: 480, h: 240 },
      { color: RED, y: 0, h: 480 },
      { color: RED, y: 720, h: 720 },
    ]);
  });
});
