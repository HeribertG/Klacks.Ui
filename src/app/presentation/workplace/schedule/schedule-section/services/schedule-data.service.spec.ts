// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { Mock, vi } from 'vitest';
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
import { WorkChangeCellFormatterService } from './cell-formatters/work-change-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/holidays-list-helper-class';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import {
    OFFICIAL_AND_REMINDER_ORDERINGS,
    OFFICIAL_HOLIDAY_NAME,
    REMINDER_RULE,
    SAME_DATE_HOLIDAY_YEAR,
    SECOND_REMINDER_RULE,
    buildHolidaysListHelper,
} from 'src/app/shared/testing/holiday-list.testing';
import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule.interface';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import {
    activeJanuaryOffsetMinutes,
    CALENDAR_TEST_ZONES,
    expectedJanuaryOffsetMinutes,
    useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

describe('ScheduleDataService', () => {
    let service: ScheduleDataService;
    let dataManagement: { clients: unknown[]; visibleStartDate: Date | null; visibleEndDate: Date | null; sealedDates: Set<string> };
    let holidayCollection: { holidays: HolidaysListHelper; currentYear: number };

    beforeEach(() => {
        holidayCollection = { holidays: new HolidaysListHelper(), currentYear: SAME_DATE_HOLIDAY_YEAR };
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
                { provide: HolidayCollectionService, useValue: holidayCollection },
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
                WorkChangeCellFormatterService,
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

    describe('two holiday entries on the same date', () => {
        const COLUMN_OF_HOLIDAY = 1;

        beforeEach(() => {
            service.startDate = new Date(SAME_DATE_HOLIDAY_YEAR, 11, 24);
        });

        it.each(OFFICIAL_AND_REMINDER_ORDERINGS)('getWeekday reports an official holiday (%s)', (_label, rules) => {
            holidayCollection.holidays = buildHolidaysListHelper(rules);

            expect(service.getWeekday(COLUMN_OF_HOLIDAY)).toBe(WeekDaysEnum.OfficiallyHoliday);
        });

        it.each(OFFICIAL_AND_REMINDER_ORDERINGS)('holidayInfo returns the official entry (%s)', (_label, rules) => {
            holidayCollection.holidays = buildHolidaysListHelper(rules);

            const holiday = service.holidayInfo(COLUMN_OF_HOLIDAY);

            expect(holiday?.officially).toBe(true);
            expect(holiday?.currentName).toEqual({ en: OFFICIAL_HOLIDAY_NAME });
        });

        it('getWeekday reports an unofficial holiday when no entry on the date is official', () => {
            holidayCollection.holidays = buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]);

            expect(service.getWeekday(COLUMN_OF_HOLIDAY)).toBe(WeekDaysEnum.Holiday);
        });
    });

    describe('isCellOutsideMembershipPeriod', () => {
        const START_DATE = new Date('2026-01-01');

        beforeEach(() => {
            service.startDate = START_DATE;
            service.rowGroupIndex = [0];
        });

        it('returns false when client has no memberSince and no memberUntil', () => {
            dataManagement.clients = [{ memberSince: undefined, memberUntil: undefined }];
            expect(service.isCellOutsideMembershipPeriod(0, 10)).toBe(false);
        });

        it('returns false when row has no client index', () => {
            service.rowGroupIndex = [];
            expect(service.isCellOutsideMembershipPeriod(0, 10)).toBe(false);
        });

        it('returns false when startDate is not set', () => {
            service.startDate = undefined;
            dataManagement.clients = [{ memberSince: '2026-01-15' }];
            expect(service.isCellOutsideMembershipPeriod(0, 0)).toBe(false);
        });

        it('returns true when date is before memberSince (entry date)', () => {
            // col 0 → 2026-01-01, memberSince = 2026-01-15 → outside
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 0)).toBe(true);
        });

        it('returns false when date equals memberSince (boundary is inside)', () => {
            // col 14 → 2026-01-15, memberSince = 2026-01-15 → on boundary, inside
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 14)).toBe(false);
        });

        it('returns false when date is within valid range', () => {
            // col 20 → 2026-01-21, memberSince = 2026-01-15, memberUntil = 2026-01-25 → inside
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 20)).toBe(false);
        });

        it('returns false when date equals memberUntil (boundary is inside)', () => {
            // col 24 → 2026-01-25, memberUntil = 2026-01-25 → on boundary, inside
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 24)).toBe(false);
        });

        it('returns true when date is after memberUntil (exit date)', () => {
            // col 25 → 2026-01-26, memberUntil = 2026-01-25 → outside
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 25)).toBe(true);
        });

        it('returns true when only memberSince set and date is before it', () => {
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: undefined }];
            expect(service.isCellOutsideMembershipPeriod(0, 0)).toBe(true);
        });

        it('returns false when only memberSince set and date is on or after it', () => {
            dataManagement.clients = [{ memberSince: '2026-01-15', memberUntil: undefined }];
            expect(service.isCellOutsideMembershipPeriod(0, 14)).toBe(false);
        });

        it('returns true when only memberUntil set and date is after it', () => {
            dataManagement.clients = [{ memberSince: undefined, memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 25)).toBe(true);
        });

        it('returns false when only memberUntil set and date is before or on it', () => {
            dataManagement.clients = [{ memberSince: undefined, memberUntil: '2026-01-25' }];
            expect(service.isCellOutsideMembershipPeriod(0, 0)).toBe(false);
        });
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

    describe('calendar dates across browser time zones', () => {
        for (const zone of CALENDAR_TEST_ZONES) {
            describe(zone, () => {
                useTimeZone(zone);

                it('activates the configured zone', () => {
                    expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
                });

                it('puts the visible start date into column 0', () => {
                    dataManagement.visibleStartDate = parseCalendarDate('2026-08-03');
                    dataManagement.visibleEndDate = parseCalendarDate('2026-09-06');

                    service.initializeDateAndColumns();

                    expect(formatDateOnly(service.getDateForColumn(0) as Date)).toBe('2026-08-03');
                    expect(service.weekdayName(0)).toBe('Monday');
                    expect(service.columns).toBe(35);
                });

                it('counts one column per calendar day across the autumn DST switch', () => {
                    dataManagement.visibleStartDate = parseCalendarDate('2026-10-20');
                    dataManagement.visibleEndDate = parseCalendarDate('2026-11-10');

                    service.initializeDateAndColumns();

                    expect(service.columns).toBe(22);
                    expect(formatDateOnly(service.getDateForColumn(21) as Date)).toBe('2026-11-10');
                });

                it('maps every wire format of a date to the column showing that date', () => {
                    dataManagement.visibleStartDate = parseCalendarDate('2026-08-03');
                    dataManagement.visibleEndDate = parseCalendarDate('2026-09-06');
                    service.initializeDateAndColumns();

                    expect(service.getColumnForDate('2026-08-03')).toBe(0);
                    expect(service.getColumnForDate('2026-08-05')).toBe(2);
                    expect(service.getColumnForDate('2026-08-05T00:00:00Z')).toBe(2);
                    expect(service.getColumnForDate('2026-08-05T00:00:00')).toBe(2);
                    expect(service.getColumnForDate('2026-09-06')).toBe(34);
                    expect(service.getColumnForDate('2026-09-07')).toBe(-1);
                });
            });
        }
    });

    describe('paste of copied absences', () => {
        const START_DATE = new Date(2026, 0, 1);
        const SOURCE_COL = 0;
        const TARGET_ROW = 0;
        const TARGET_COL = 3;
        const NO_TIMES_RECORDED = '00:00:00';
        const FULL_DAY_START = '00:00:00';
        const FULL_DAY_END = '23:59:00';
        const DURATION_MODE_HOURS = 4.5;
        const FULL_DAY_SOURCE_HOURS = 8.4;
        const ABSENCE_ID = 'absence-1';
        const CLIENT_ID = 'client-1';
        let bulkAddBreaks: ReturnType<typeof vi.fn>;

        function breakCell(startTime: string, endTime: string, changeTime: number | null): ScheduleCell {
            return Object.assign(new ScheduleCell(), {
                entryType: WorkScheduleEntryType.Break,
                entryId: ABSENCE_ID,
                startTime,
                endTime,
                changeTime,
            });
        }

        function copyAndPaste(source: ScheduleCell): BreakCellParams[] {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockImplementation((_row: number, col: number) =>
                col === SOURCE_COL ? source : undefined);
            service.onCopy(TARGET_ROW, SOURCE_COL, TARGET_ROW, SOURCE_COL);
            service.handlePaste(TARGET_ROW, TARGET_COL, []);
            return bulkAddBreaks.mock.calls[0][0] as BreakCellParams[];
        }

        beforeEach(() => {
            bulkAddBreaks = vi.fn().mockResolvedValue(undefined);
            Object.assign(dataManagement, { clients: [{ id: CLIENT_ID }], bulkAddBreakScheduleEntries: bulkAddBreaks });
            service.startDate = START_DATE;
            service.rowGroupIndex = [0];
            vi.spyOn(service, 'isCellActive').mockReturnValue(false);
        });

        it('sends workTime 0 for a copied time-span absence so the target employee gets recomputed hours', () => {
            const pasted = copyAndPaste(breakCell(FULL_DAY_START, FULL_DAY_END, FULL_DAY_SOURCE_HOURS));

            expect(pasted).toHaveLength(1);
            expect(pasted[0]).toMatchObject({
                clientId: CLIENT_ID,
                absenceId: ABSENCE_ID,
                workTime: 0,
                startTime: FULL_DAY_START,
                endTime: FULL_DAY_END,
            });
        });

        it('carries the recorded hours of a copied duration-mode absence', () => {
            const pasted = copyAndPaste(breakCell(NO_TIMES_RECORDED, NO_TIMES_RECORDED, DURATION_MODE_HOURS));

            expect(pasted).toHaveLength(1);
            expect(pasted[0]).toMatchObject({
                workTime: DURATION_MODE_HOURS,
                startTime: NO_TIMES_RECORDED,
                endTime: NO_TIMES_RECORDED,
            });
        });

        it('sends workTime 0 for equal bounds without recorded hours', () => {
            const pasted = copyAndPaste(breakCell(NO_TIMES_RECORDED, NO_TIMES_RECORDED, null));

            expect(pasted[0].workTime).toBe(0);
        });
    });

    describe('expense entry wording', () => {
        const ROW = 0;
        const COL = 0;
        const EXPENSE_TOOLTIP_KEY = 'workChange.tooltip.expenses';
        const ALLOWANCE_TOOLTIP_KEY = 'workChange.tooltip.reimbursement';
        const EXPENSE_ABBR_KEY = 'workChange.abbr.expenses';
        const ALLOWANCE_ABBR_KEY = 'workChange.abbr.reimbursement';

        function expenseEntry(taxable: boolean): ScheduleCell {
            return Object.assign(new ScheduleCell(), {
                entryType: WorkScheduleEntryType.Expenses,
                taxable,
                amount: 12.5,
            });
        }

        beforeEach(() => {
            const translate = TestBed.inject(TranslateService);
            vi.mocked(translate.instant).mockImplementation((key: string | string[]) => String(key));
            Object.assign(TestBed.inject(GridColorService), { surchargeColor: '#surcharge', workChangeColor: '#workchange' });
        });

        it('labels a non-taxable expense (Spesen) with the expenses tooltip and abbreviation', () => {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(expenseEntry(false));

            const cell = service.getCell(ROW, COL);

            expect(cell.tooltip).toBe(EXPENSE_TOOLTIP_KEY);
            expect(cell.mainText).toBe(EXPENSE_ABBR_KEY);
        });

        it('labels a taxable allowance (Verguetung) with the reimbursement tooltip and abbreviation', () => {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(expenseEntry(true));

            const cell = service.getCell(ROW, COL);

            expect(cell.tooltip).toBe(ALLOWANCE_TOOLTIP_KEY);
            expect(cell.mainText).toBe(ALLOWANCE_ABBR_KEY);
        });
    });

    describe('work change cell formatting', () => {
        const WORK_CHANGE_COLOR = '#workchange';
        const SURCHARGE_COLOR = '#surcharge';

        function workChangeEntry(overrides: Partial<ScheduleCell>): ScheduleCell {
            return Object.assign(new ScheduleCell(), {
                entryType: WorkScheduleEntryType.WorkChange,
                startTime: '08:00:00',
                endTime: '09:30:00',
                changeTime: 1.5,
                workChangeType: 0,
            }, overrides);
        }

        function cellFor(entry: ScheduleCell) {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(entry);
            return service.getCell(0, 0);
        }

        beforeEach(() => {
            const translate = TestBed.inject(TranslateService);
            vi.mocked(translate.instant).mockImplementation((key: string | string[]) => String(key));
            Object.assign(TestBed.inject(GridColorService), { surchargeColor: SURCHARGE_COLOR, workChangeColor: WORK_CHANGE_COLOR });
        });

        it('formats a correction with change time, time range and work change color', () => {
            const cell = cellFor(workChangeEntry({}));

            expect(cell.mainText).toBe('workChange.abbr.correction');
            expect(cell.tooltip).toBe('workChange.tooltip.correction');
            expect(cell.firstSubText).toBe('1h 30m');
            expect(cell.secondSubText).toBe('08:00 - 09:30');
            expect(cell.backgroundColor).toBe(WORK_CHANGE_COLOR);
            expect(cell.sealed).toBe(false);
        });

        it.each<[number, string, string]>([
            [4, 'workChange.abbr.travelStart', 'workChange.tooltip.travel'],
            [5, 'workChange.abbr.travelEnd', 'workChange.tooltip.travel'],
            [6, 'workChange.abbr.travelWithin', 'workChange.tooltip.travel'],
            [7, 'workChange.abbr.briefing', 'workChange.tooltip.briefing'],
            [8, 'workChange.abbr.debriefing', 'workChange.tooltip.briefing'],
            [1, 'workChange.abbr.correction', 'workChange.tooltip.correction'],
            [9, 'workChange.abbr.correction', 'workChange.tooltip.correction'],
        ])('maps work change type %s to its abbreviation and tooltip', (type, abbr, tooltip) => {
            const cell = cellFor(workChangeEntry({ workChangeType: type }));

            expect(cell.mainText).toBe(abbr);
            expect(cell.tooltip).toBe(tooltip);
        });

        it('labels a replacement regardless of its work change type', () => {
            const cell = cellFor(workChangeEntry({ workChangeType: 4, replaceClientId: 'other-client' }));

            expect(cell.mainText).toBe('workChange.abbr.replacement');
            expect(cell.tooltip).toBe('workChange.tooltip.replacement');
        });

        it.each<[number | null, string]>([
            [2, '2h'],
            [0.25, '15m'],
            [-0.25, '-15m'],
            [-1.75, '-1h 45m'],
            [0, ''],
            [null, ''],
        ])('formats change time %s as "%s"', (changeTime, expected) => {
            const cell = cellFor(workChangeEntry({ changeTime }));

            expect(cell.firstSubText).toBe(expected);
        });

        it('seals a locked or group restricted work change', () => {
            expect(cellFor(workChangeEntry({ lockLevel: 1 })).sealed).toBe(true);
            expect(cellFor(workChangeEntry({ isGroupRestricted: true })).sealed).toBe(true);
        });

        it.each<[number | null, string]>([
            [12.5, '12.50'],
            [0, ''],
            [null, ''],
        ])('formats an expense amount %s as "%s" without first sub text', (amount, expected) => {
            const cell = cellFor(workChangeEntry({ entryType: WorkScheduleEntryType.Expenses, taxable: false, amount }));

            expect(cell.firstSubText).toBe('');
            expect(cell.secondSubText).toBe(expected);
            expect(cell.backgroundColor).toBe(SURCHARGE_COLOR);
        });
    });

    describe('availability', () => {
        const HIGHLIGHT_COLOR = '#available';
        const START = '2026-03-02';
        let availabilities: Map<string, Map<string, string>>;
        let showAvailability: Mock;

        beforeEach(() => {
            const translate = TestBed.inject(TranslateService);
            vi.mocked(translate.instant).mockImplementation((key: string | string[]) => String(key));
            Object.assign(TestBed.inject(GridColorService), { availabilityHighlightColor: HIGHLIGHT_COLOR });
            Object.assign(TestBed.inject(EmptyCellFormatterService), { formatCell: () => new GridCell() });
            showAvailability = vi.fn().mockReturnValue(true);
            availabilities = new Map([['c1', new Map([['2026-03-03', '08:00-12:00, 22:00-06:00']])]]);
            Object.assign(dataManagement, { showAvailability, clientAvailabilities: availabilities });
            dataManagement.clients = [{ id: 'c1' }];
            service.rowGroupIndex = [0];
            service.startDate = parseCalendarDate(START) as Date;
        });

        it('builds the tooltip from the label and one line per range', () => {
            expect(service.getAvailabilityTooltipForCell(0, 1))
                .toBe('schedule.availability.times:\n08:00 – 12:00\n22:00 – 06:00');
        });

        it('returns no tooltip and no ranges when availability is hidden', () => {
            showAvailability.mockReturnValue(false);

            expect(service.getAvailabilityTooltipForCell(0, 1)).toBeUndefined();
            expect(service.getAvailabilityRangesForCell(0, 1)).toEqual([]);
        });

        it('returns no tooltip for a day without availability or a row without client', () => {
            expect(service.getAvailabilityTooltipForCell(0, 0)).toBeUndefined();
            expect(service.getAvailabilityTooltipForCell(5, 1)).toBeUndefined();
        });

        it('returns the parsed minute ranges of the day', () => {
            expect(service.getAvailabilityRangesForCell(0, 1)).toEqual([
                { startMinutes: 480, endMinutes: 720 },
                { startMinutes: 1320, endMinutes: 1440 },
                { startMinutes: 0, endMinutes: 360 },
            ]);
            expect(service.getAvailabilityRangesForCell(0, 0)).toEqual([]);
        });

        it('highlights an empty cell and puts the availability into its tooltip', () => {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(undefined);

            const cell = service.getCell(0, 1);

            expect(cell.backgroundColor).toBe(HIGHLIGHT_COLOR);
            expect(cell.tooltip).toBe('schedule.availability.times:\n08:00 – 12:00\n22:00 – 06:00');
        });

        it('keeps the color and tooltip of a filled cell', () => {
            Object.assign(TestBed.inject(GridColorService), { workChangeColor: '#workchange' });
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(Object.assign(new ScheduleCell(), {
                entryType: WorkScheduleEntryType.WorkChange,
                workChangeType: 0,
            }));

            const cell = service.getCell(0, 1);

            expect(cell.backgroundColor).toBe('#workchange');
            expect(cell.tooltip).toBe('workChange.tooltip.correction');
        });

        it('leaves a cell untouched on a day without availability', () => {
            vi.spyOn(service, 'getWorkScheduleEntryForCell').mockReturnValue(undefined);

            const cell = service.getCell(0, 0);

            expect(cell.backgroundColor).toBeUndefined();
            expect(cell.tooltip).toBe('');
        });
    });

    describe('paste', () => {
        const START = '2026-03-02';
        let bulkWork: Mock;
        let bulkBreak: Mock;
        let activeCells: Set<string>;

        function shift(overrides: Partial<IShiftSchedule>): IShiftSchedule {
            return {
                shiftId: 'shift-early',
                date: parseCalendarDate('2026-03-04') as Date,
                abbreviation: 'Fr',
                startShift: '06:00:00',
                endShift: '14:00:00',
                workTime: 8,
                isTimeRange: false,
                ...overrides,
            } as IShiftSchedule;
        }

        function entry(overrides: Partial<ScheduleCell>): ScheduleCell {
            return Object.assign(new ScheduleCell(), overrides);
        }

        function copyEntries(cells: Record<string, ScheduleCell | undefined>, maxRow: number, maxCol: number): void {
            const spy = vi.spyOn(service, 'getWorkScheduleEntryForCell')
                .mockImplementation((row: number, col: number) => cells[`${row}:${col}`]);
            service.onCopy(0, 0, maxRow, maxCol);
            spy.mockRestore();
        }

        function dateAt(col: number): Date {
            return service.getDateForColumn(col) as Date;
        }

        beforeEach(() => {
            bulkWork = vi.fn();
            bulkBreak = vi.fn();
            activeCells = new Set<string>();
            Object.assign(dataManagement, {
                bulkAddWorkScheduleEntries: bulkWork,
                bulkAddBreakScheduleEntries: bulkBreak,
                shiftSchedules: [
                    shift({}),
                    shift({ shiftId: 'shift-late', abbreviation: 'Sp', startShift: '14:00:00', endShift: '22:00:00' }),
                    shift({ shiftId: 'shift-early', date: parseCalendarDate('2026-03-05') as Date }),
                    shift({
                        shiftId: 'shift-range', abbreviation: 'Fl', startShift: '06:00:00', endShift: '18:00:00',
                        workTime: 4, isTimeRange: true,
                    }),
                ],
            });
            dataManagement.clients = [{ id: 'c1' }, { id: 'c2' }, { id: '' }];
            service.rowGroupIndex = [0, 1, 2];
            service.startDate = parseCalendarDate(START) as Date;
            vi.spyOn(service, 'isCellActive').mockImplementation((row: number, col: number) => activeCells.has(`${row}:${col}`));
        });

        it('pastes copied work and break entries onto the target client and days', () => {
            copyEntries({
                '0:0': entry({ entryType: WorkScheduleEntryType.Work, entryId: 'shift-early', startTime: '06:00:00', endTime: '14:00:00' }),
                '0:1': entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-1', startTime: '', endTime: '' }),
                '0:2': entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-2', startTime: '10:00:00', endTime: '12:00:00' }),
            }, 0, 2);

            service.handlePaste(1, 2, [['ignored']]);

            expect(bulkWork).toHaveBeenCalledTimes(1);
            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c2', date: dateAt(2), shiftId: 'shift-early', workTime: 8, startTime: '06:00:00', endTime: '14:00:00' },
            ]);
            expect(bulkBreak).toHaveBeenCalledTimes(1);
            expect(bulkBreak).toHaveBeenCalledWith([
                { clientId: 'c2', absenceId: 'absence-1', date: dateAt(3), workTime: 0, startTime: '00:00', endTime: '00:00' },
                { clientId: 'c2', absenceId: 'absence-2', date: dateAt(4), workTime: 0, startTime: '10:00:00', endTime: '12:00:00' },
            ]);
        });

        it('drops copied work whose shift does not exist on the target day and calls no bulk add when nothing is left', () => {
            copyEntries({ '0:0': entry({ entryType: WorkScheduleEntryType.Work, entryId: 'shift-early' }) }, 0, 0);

            service.handlePaste(0, 0, []);

            expect(bulkWork).not.toHaveBeenCalled();
            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('keeps the copied span of a time range shift when it fits the window', () => {
            copyEntries({ '0:0': entry({ entryType: WorkScheduleEntryType.Work, entryId: 'shift-range', startTime: '09:00:00', endTime: '12:00:00' }) }, 0, 0);

            service.handlePaste(0, 2, []);

            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c1', date: dateAt(2), shiftId: 'shift-range', workTime: 3, startTime: '09:00:00', endTime: '12:00:00' },
            ]);
        });

        it('books the default placement of a time range shift when the copied span does not fit', () => {
            copyEntries({ '0:0': entry({ entryType: WorkScheduleEntryType.Work, entryId: 'shift-range', startTime: '17:00:00', endTime: '20:00:00' }) }, 0, 0);

            service.handlePaste(0, 2, []);

            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c1', date: dateAt(2), shiftId: 'shift-range', workTime: 4, startTime: '06:00:00', endTime: '10:00:00' },
            ]);
        });

        function pasteCopiedBreakAt(row: number): void {
            copyEntries({ '0:0': entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-1' }) }, 0, 0);
            service.handlePaste(row, 2, []);
        }

        it('skips a sealed target day', () => {
            dataManagement.sealedDates = new Set([formatDateOnly(dateAt(2))]);

            pasteCopiedBreakAt(0);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('skips a target day outside the membership period', () => {
            dataManagement.clients = [{ id: 'c1', memberSince: '2026-03-05' }];

            pasteCopiedBreakAt(0);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('skips a target day outside the group period', () => {
            dataManagement.clients = [{ id: 'c1', groupItemValidUntil: '2026-03-03' }];

            pasteCopiedBreakAt(0);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('skips an already filled target cell', () => {
            activeCells.add('0:2');

            pasteCopiedBreakAt(0);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('skips a target row whose client has no id', () => {
            pasteCopiedBreakAt(2);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('skips a target row outside the visible rows', () => {
            pasteCopiedBreakAt(7);

            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('keeps the other cells of a block when single targets are skipped', () => {
            const absence = entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-1' });
            copyEntries({ '0:0': absence, '0:1': absence, '0:2': absence }, 0, 2);
            activeCells.add('0:3');

            service.handlePaste(0, 2, []);

            expect(bulkBreak).toHaveBeenCalledWith([
                { clientId: 'c1', absenceId: 'absence-1', date: dateAt(2), workTime: 0, startTime: '00:00', endTime: '00:00' },
                { clientId: 'c1', absenceId: 'absence-1', date: dateAt(4), workTime: 0, startTime: '00:00', endTime: '00:00' },
            ]);
        });

        it('pastes external text by trimmed, case-insensitive abbreviation on the same day only', () => {
            service.handlePaste(0, 2, [[' fr ', 'SP', ''], ['sp', '   ', 'Fr']]);

            expect(bulkWork).toHaveBeenCalledTimes(1);
            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c1', date: dateAt(2), shiftId: 'shift-early', workTime: 8, startTime: '06:00:00', endTime: '14:00:00' },
                { clientId: 'c2', date: dateAt(2), shiftId: 'shift-late', workTime: 8, startTime: '14:00:00', endTime: '22:00:00' },
            ]);
            expect(bulkBreak).not.toHaveBeenCalled();
        });

        it('books the default placement for an external time range abbreviation', () => {
            service.handlePaste(1, 2, [['FL']]);

            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c2', date: dateAt(2), shiftId: 'shift-range', workTime: 4, startTime: '06:00:00', endTime: '10:00:00' },
            ]);
        });

        it('applies the same target checks to external text', () => {
            dataManagement.sealedDates = new Set([formatDateOnly(dateAt(2))]);

            service.handlePaste(0, 2, [['Fr']]);

            expect(bulkWork).not.toHaveBeenCalled();
        });

        it('falls back to the external text after the copy was cleared', () => {
            copyEntries({ '0:0': entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-1' }) }, 0, 0);
            service.onClearCopy();

            service.handlePaste(0, 2, [['Fr']]);

            expect(bulkBreak).not.toHaveBeenCalled();
            expect(bulkWork).toHaveBeenCalledWith([
                { clientId: 'c1', date: dateAt(2), shiftId: 'shift-early', workTime: 8, startTime: '06:00:00', endTime: '14:00:00' },
            ]);
        });

        it('pastes a snapshot of the copied entries', () => {
            const copied = entry({ entryType: WorkScheduleEntryType.Break, entryId: 'absence-1' });
            copyEntries({ '0:0': copied }, 0, 0);
            copied.entryId = 'changed-after-copy';

            service.handlePaste(0, 2, []);

            expect(bulkBreak).toHaveBeenCalledWith([
                { clientId: 'c1', absenceId: 'absence-1', date: dateAt(2), workTime: 0, startTime: '00:00', endTime: '00:00' },
            ]);
        });
    });
});
