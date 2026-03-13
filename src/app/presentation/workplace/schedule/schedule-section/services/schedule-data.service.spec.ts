// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TranslateService } from '@ngx-translate/core';

import { ScheduleDataService } from './schedule-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { EmptyCellFormatterService } from './cell-formatters/empty-cell-formatter.service';
import { WorkCellFormatterService } from './cell-formatters/work-cell-formatter.service';
import { BreakCellFormatterService } from './cell-formatters/break-cell-formatter.service';
import { ScheduleNoteCellFormatterService } from './cell-formatters/schedule-note-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';

describe('ScheduleDataService', () => {
    let service: ScheduleDataService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ScheduleDataService,
                { provide: ScrollService, useValue: { maxRows: 0, maxCols: 0 } },
                { provide: HolidayCollectionService, useValue: { holidays: { holidayList: [] } } },
                { provide: GridSettingsService, useValue: { weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
                { provide: DataManagementScheduleService, useValue: {
                        workFilter: { currentYear: 2024, currentMonth: 1, paymentInterval: 2 },
                        clients: [],
                        shiftSchedules: [],
                        visibleStartDate: null,
                        visibleEndDate: null,
                        availableShiftsByDay: []
                    } },
                { provide: AppSettingsManagementService, useValue: {
                        workSettings: () => ({ dayVisibleBefore: 3, dayVisibleAfter: 3, paymentInterval: 2 })
                    } },
                { provide: EmptyCellFormatterService, useValue: { format: vi.fn() } },
                { provide: WorkCellFormatterService, useValue: { format: vi.fn() } },
                { provide: BreakCellFormatterService, useValue: { format: vi.fn() } },
                { provide: ScheduleNoteCellFormatterService, useValue: { formatCell: vi.fn() } },
                { provide: AbsenceLookupService, useValue: { getAbbreviationForEntryId: () => '' } },
                { provide: GridColorService, useValue: {} },
                { provide: TranslateService, useValue: { currentLang: 'de' } },
                { provide: BaseSettingsService, useValue: {} },
                { provide: BreakPlaceholderScheduleLoaderService, useValue: { load: vi.fn() } },
                { provide: GridFontsService, useValue: {} }
            ]
        });
        service = TestBed.inject(ScheduleDataService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
