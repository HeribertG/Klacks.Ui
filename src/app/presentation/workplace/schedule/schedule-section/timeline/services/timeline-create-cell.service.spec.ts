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
