// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ScheduleDataService } from './schedule-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { EmptyCellFormatterService } from './cell-formatters/empty-cell-formatter.service';
import { WorkCellFormatterService } from './cell-formatters/work-cell-formatter.service';
import { BreakCellFormatterService } from './cell-formatters/break-cell-formatter.service';
import { ScheduleNoteCellFormatterService } from './cell-formatters/schedule-note-cell-formatter.service';
import { ScheduleCommandCellFormatterService } from './cell-formatters/schedule-command-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';

describe('ScheduleDataService', () => {
    let service: ScheduleDataService;
    let dataManagement: { clients: unknown[] };

    beforeEach(() => {
        const dm = {
            workFilter: { currentYear: 2024, currentMonth: 1, paymentInterval: 2 },
            clients: [] as unknown[],
            shiftSchedules: [],
            visibleStartDate: null,
            visibleEndDate: null,
            availableShiftsByDay: [],
            overbookedShiftsByDay: [],
            showAvailability: vi.fn().mockReturnValue(false),
            sealedDates: new Set<string>(),
        };
        dataManagement = dm;

        TestBed.configureTestingModule({
            providers: [
                ScheduleDataService,
                { provide: ScrollService, useValue: { maxRows: 0, maxCols: 0 } },
                { provide: HolidayCollectionService, useValue: { holidays: { holidayList: [] } } },
                { provide: GridSettingsService, useValue: { weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
                { provide: DataManagementScheduleService, useValue: dataManagement },
                { provide: AppSettingsManagementService, useValue: {
                        workSettings: () => ({ dayVisibleBefore: 3, dayVisibleAfter: 3, paymentInterval: 2 })
                    } },
                { provide: WeekConfigurationService, useValue: {
                        isWeekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
                        getWeekendSlot: (date: Date) => date.getDay() === 6 ? 1 : date.getDay() === 0 ? 2 : null
                    } },
                { provide: EmptyCellFormatterService, useValue: { format: vi.fn() } },
                { provide: WorkCellFormatterService, useValue: { format: vi.fn() } },
                { provide: BreakCellFormatterService, useValue: { format: vi.fn() } },
                { provide: ScheduleNoteCellFormatterService, useValue: { formatCell: vi.fn() } },
                { provide: ScheduleCommandCellFormatterService, useValue: { formatCell: vi.fn() } },
                { provide: AbsenceLookupService, useValue: { getAbbreviationForEntryId: () => '' } },
                { provide: GridColorService, useValue: {} },
                { provide: TranslateService, useValue: { currentLang: 'de', instant: vi.fn().mockReturnValue(''), get: vi.fn().mockReturnValue(of('')), onTranslationChange: of(), onLangChange: of(), onDefaultLangChange: of() } },
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

    describe('isCellOutsideGroupPeriod', () => {
        const START_DATE = new Date('2026-01-01');

        beforeEach(() => {
            service.startDate = START_DATE;
            service.rowGroupIndex = [0];
        });

        it('returns false when client has no groupItemValidFrom and no groupItemValidUntil', () => {
            dataManagement.clients = [{ groupItemValidFrom: undefined, groupItemValidUntil: undefined }];
            expect(service.isCellOutsideGroupPeriod(0, 10)).toBe(false);
        });

        it('returns false when row has no client index', () => {
            service.rowGroupIndex = [];
            expect(service.isCellOutsideGroupPeriod(0, 10)).toBe(false);
        });

        it('returns false when startDate is not set', () => {
            service.startDate = undefined;
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15' }];
            expect(service.isCellOutsideGroupPeriod(0, 0)).toBe(false);
        });

        it('returns true when date is before groupItemValidFrom', () => {
            // col 0 → 2026-01-01, validFrom = 2026-01-15 → outside
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 0)).toBe(true);
        });

        it('returns false when date equals groupItemValidFrom (boundary is inside)', () => {
            // col 14 → 2026-01-15, validFrom = 2026-01-15 → on boundary, inside
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 14)).toBe(false);
        });

        it('returns false when date is within valid range', () => {
            // col 20 → 2026-01-21, validFrom = 2026-01-15, validUntil = 2026-01-25 → inside
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 20)).toBe(false);
        });

        it('returns false when date equals groupItemValidUntil (boundary is inside)', () => {
            // col 24 → 2026-01-25, validUntil = 2026-01-25 → on boundary, inside
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 24)).toBe(false);
        });

        it('returns true when date is after groupItemValidUntil', () => {
            // col 25 → 2026-01-26, validUntil = 2026-01-25 → outside
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 25)).toBe(true);
        });

        it('returns true when only validFrom set and date is before it', () => {
            // col 0 → 2026-01-01, validFrom = 2026-01-15, no validUntil
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: undefined }];
            expect(service.isCellOutsideGroupPeriod(0, 0)).toBe(true);
        });

        it('returns false when only validFrom set and date is on or after it', () => {
            // col 14 → 2026-01-15, validFrom = 2026-01-15, no validUntil → no upper bound
            dataManagement.clients = [{ groupItemValidFrom: '2026-01-15', groupItemValidUntil: undefined }];
            expect(service.isCellOutsideGroupPeriod(0, 14)).toBe(false);
        });

        it('returns true when only validUntil set and date is after it', () => {
            // col 25 → 2026-01-26, no validFrom, validUntil = 2026-01-25
            dataManagement.clients = [{ groupItemValidFrom: undefined, groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 25)).toBe(true);
        });

        it('returns false when only validUntil set and date is before or on it', () => {
            // col 0 → 2026-01-01, no validFrom, validUntil = 2026-01-25 → no lower bound
            dataManagement.clients = [{ groupItemValidFrom: undefined, groupItemValidUntil: '2026-01-25' }];
            expect(service.isCellOutsideGroupPeriod(0, 0)).toBe(false);
        });
    });
});
