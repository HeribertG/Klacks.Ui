// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CutShiftListComponent } from './cut-shift-list.component';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { NgbModal, NgbCalendar, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { transformStringToOwnTimeStruct } from 'src/app/domain/helpers/own-time.helper';
import { provideHttpClient } from '@angular/common/http';

describe('CutShiftListComponent - Time Cut Logic', () => {
    let component: CutShiftListComponent;
    let fixture: ComponentFixture<CutShiftListComponent>;
    let mockModalService: any;
    let mockDataService: any;

    beforeEach(() => {
        mockModalService = {
            open: vi.fn()
        };
        mockDataService = {
            calculateNestedSetValues: vi.fn(),
            addCutShift: vi.fn()
        };

        TestBed.configureTestingModule({
            imports: [CutShiftListComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: NgbModal, useValue: mockModalService },
                { provide: DataManagementShiftCutService, useValue: mockDataService },
                {
                    provide: TranslateService,
                    useValue: {
                        get: vi.fn(),
                        instant: vi.fn()
                    },
                },
                {
                    provide: NgbCalendar,
                    useValue: {
                        getToday: vi.fn(),
                        getNext: vi.fn()
                    },
                },
            ],
        });

        fixture = TestBed.createComponent(CutShiftListComponent);
        component = fixture.componentInstance;
    });

    describe('Cut Time Logic Tests', () => {
        // Helper-Funktionen für Dauer-Berechnungen
        const timeToMinutes = (time: string): number => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const calculateShiftDuration = (startTime: string, endTime: string, _cuttingAfterMidnight: boolean): number => {
            const startMinutes = timeToMinutes(startTime);
            const endMinutes = timeToMinutes(endTime);

            if (startTime === endTime) {
                return 24 * 60;
            }

            if (endMinutes < startMinutes) {
                return 24 * 60 - startMinutes + endMinutes;
            }
            else {
                return endMinutes - startMinutes;
            }
        };

        const _formatDuration = (minutes: number): string => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}:${mins.toString().padStart(2, '0')}`;
        };
        interface TestCase {
            description: string;
            parentShift: {
                start: string;
                end: string;
                date: Date;
                cuttingAfterMidnight?: boolean;
                expectedDurationMinutes?: number; // Erwartete Gesamtdauer in Minuten (optional)
            };
            cutTime: string;
            expected: {
                original: {
                    start: string;
                    end: string;
                    date: Date;
                    cuttingAfterMidnight: boolean;
                    expectedDurationMinutes?: number; // Erwartete Dauer des Original-Shifts (optional)
                };
                copied: {
                    start: string;
                    end: string;
                    date: Date;
                    cuttingAfterMidnight: boolean;
                    expectedDurationMinutes?: number; // Erwartete Dauer des kopierten Shifts (optional)
                };
            };
        }

        const testCases: TestCase[] = [
            // 24-Stunden Shifts
            {
                description: '24h Shift (00:00-00:00) cut at 12:00 → 12h + 12h = 24h',
                parentShift: {
                    start: '00:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 1440,
                },
                cutTime: '12:00',
                expected: {
                    original: {
                        start: '00:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                    copied: {
                        start: '12:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                },
            },
            {
                description: '24h Shift (07:00-07:00) cut at 15:00 → 8h + 16h = 24h',
                parentShift: {
                    start: '07:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 1440,
                },
                cutTime: '15:00',
                expected: {
                    original: {
                        start: '07:00',
                        end: '15:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                    copied: {
                        start: '15:00',
                        end: '07:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 960,
                    },
                },
            },
            {
                description: '24h Shift (12:00-12:00) cut at 18:00 → 6h + 18h = 24h',
                parentShift: {
                    start: '12:00',
                    end: '12:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 1440,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '12:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '18:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 1080,
                    },
                },
            },

            // Normal Shifts (nicht über Mitternacht)
            {
                description: 'Normal Shift (06:00-14:00) cut at 10:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '10:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '10:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '10:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Normal Shift (08:00-16:00) cut at 12:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '08:00',
                    end: '16:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '12:00',
                expected: {
                    original: {
                        start: '08:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '12:00',
                        end: '16:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Normal Shift (14:00-22:00) cut at 18:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '14:00',
                    end: '22:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '14:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '18:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },

            // Over-Midnight Shifts - erster Cut
            {
                description: 'Over-Midnight (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Over-Midnight (20:00-04:00) cut at 23:00 → 3h + 5h = 8h',
                parentShift: {
                    start: '20:00',
                    end: '04:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '23:00',
                expected: {
                    original: {
                        start: '20:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 180,
                    },
                    copied: {
                        start: '23:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                },
            },
            {
                description: 'Over-Midnight (18:00-02:00) cut at 22:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '18:00',
                    end: '02:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '22:00',
                expected: {
                    original: {
                        start: '18:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },

            // Over-Midnight Shifts - zweiter Cut (Parent hat bereits cuttingAfterMidnight)
            {
                description: 'Already Over-Midnight (15:00-07:00) cut at 23:00 → 8h + 8h = 16h',
                parentShift: {
                    start: '15:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 960,
                },
                cutTime: '23:00',
                expected: {
                    original: {
                        start: '15:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                    copied: {
                        start: '23:00',
                        end: '07:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (15:00-07:00) cut at 03:00 → 12h + 4h = 16h',
                parentShift: {
                    start: '15:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 960,
                },
                cutTime: '03:00',
                expected: {
                    original: {
                        start: '15:00',
                        end: '03:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                    copied: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (23:00-07:00) cut at 03:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '23:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '03:00',
                expected: {
                    original: {
                        start: '23:00',
                        end: '03:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },

            // Spezielle Grenzfälle
            {
                description: 'Cut exactly at midnight (20:00-04:00) cut at 00:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '20:00',
                    end: '04:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '20:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '00:00',
                        end: '04:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Start at midnight (00:00-08:00) cut at 04:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '00:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '00:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'End at midnight (16:00-00:00) cut at 20:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '16:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '20:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },

            // Weitere Testfälle für vollständige Abdeckung
            {
                description: 'Early morning shift (04:00-12:00) cut at 08:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '04:00',
                    end: '12:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '08:00',
                expected: {
                    original: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '08:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Late evening shift (19:00-03:00) cut at 01:00 → 6h + 2h = 8h',
                parentShift: {
                    start: '19:00',
                    end: '03:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '19:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '01:00',
                        end: '03:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: 'Night shift (23:30-07:30) cut at 03:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '23:30',
                    end: '07:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '03:30',
                expected: {
                    original: {
                        start: '23:30',
                        end: '03:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '03:30',
                        end: '07:30',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (22:00-06:00) cut at 04:00 → 6h + 2h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '04:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: '12-hour shift (12:00-00:00) cut at 18:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '12:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '12:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '18:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Morning to evening (05:00-21:00) cut at 13:00 → 8h + 8h = 16h',
                parentShift: {
                    start: '05:00',
                    end: '21:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 960,
                },
                cutTime: '13:00',
                expected: {
                    original: {
                        start: '05:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                    copied: {
                        start: '13:00',
                        end: '21:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (21:00-05:00) cut at 02:00 → 5h + 3h = 8h',
                parentShift: {
                    start: '21:00',
                    end: '05:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '21:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                    copied: {
                        start: '02:00',
                        end: '05:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 180,
                    },
                },
            },
            {
                description: 'Afternoon shift (13:00-21:00) cut at 17:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '13:00',
                    end: '21:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '17:00',
                expected: {
                    original: {
                        start: '13:00',
                        end: '17:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '17:00',
                        end: '21:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Cross midnight (17:00-01:00) cut at 22:00 → 5h + 3h = 8h',
                parentShift: {
                    start: '17:00',
                    end: '01:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '22:00',
                expected: {
                    original: {
                        start: '17:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                    copied: {
                        start: '22:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 180,
                    },
                },
            },
            {
                description: 'Early morning over midnight (03:00-11:00) cut at 07:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '03:00',
                    end: '11:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '07:00',
                expected: {
                    original: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '07:00',
                        end: '11:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: '15-minute precision (23:45-07:15) cut at 03:45 → 4h + 3.5h = 7.5h',
                parentShift: {
                    start: '23:45',
                    end: '07:15',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 450,
                },
                cutTime: '03:45',
                expected: {
                    original: {
                        start: '23:45',
                        end: '03:45',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '03:45',
                        end: '07:15',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 210,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (16:00-08:00) cut at 23:30 → 7.5h + 8.5h = 16h',
                parentShift: {
                    start: '16:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 960,
                },
                cutTime: '23:30',
                expected: {
                    original: {
                        start: '16:00',
                        end: '23:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 450,
                    },
                    copied: {
                        start: '23:30',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 510,
                    },
                },
            },
            {
                description: 'Already Over-Midnight (16:00-08:00) cut at 04:00 → 12h + 4h = 16h',
                parentShift: {
                    start: '16:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 960,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                    copied: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Full night (20:00-08:00) cut at 00:30 → 4.5h + 7.5h = 12h',
                parentShift: {
                    start: '20:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '00:30',
                expected: {
                    original: {
                        start: '20:00',
                        end: '00:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 270,
                    },
                    copied: {
                        start: '00:30',
                        end: '08:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 450,
                    },
                },
            },
            {
                description: 'Exact 8 hours (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: '10-hour shift (14:00-00:00) cut at 19:00 → 5h + 5h = 10h',
                parentShift: {
                    start: '14:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 600,
                },
                cutTime: '19:00',
                expected: {
                    original: {
                        start: '14:00',
                        end: '19:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                    copied: {
                        start: '19:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                },
            },
            {
                description: 'Swing shift (15:30-23:30) cut at 19:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '15:30',
                    end: '23:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '19:30',
                expected: {
                    original: {
                        start: '15:30',
                        end: '19:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '19:30',
                        end: '23:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Graveyard shift (00:00-08:00) cut at 04:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '00:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '00:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Split shift already over midnight (19:00-03:00) cut at 23:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '19:00',
                    end: '03:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '23:00',
                expected: {
                    original: {
                        start: '19:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '23:00',
                        end: '03:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Split shift already over midnight (19:00-03:00) cut at 01:00 → 6h + 2h = 8h',
                parentShift: {
                    start: '19:00',
                    end: '03:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '19:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '01:00',
                        end: '03:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: 'Long day shift (06:00-18:00) cut at 12:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '06:00',
                    end: '18:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '12:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '12:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Evening to morning (18:00-06:00) cut at 00:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '18:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '18:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '00:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Already midnight crossing (21:30-05:30) cut at 01:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '21:30',
                    end: '05:30',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '01:30',
                expected: {
                    original: {
                        start: '21:30',
                        end: '01:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '01:30',
                        end: '05:30',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Short night shift (23:00-03:00) cut at 01:00 → 2h + 2h = 4h',
                parentShift: {
                    start: '23:00',
                    end: '03:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 240,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '23:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                    copied: {
                        start: '01:00',
                        end: '03:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: '16-hour shift (08:00-00:00) cut at 16:00 → 8h + 8h = 16h',
                parentShift: {
                    start: '08:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 960,
                },
                cutTime: '16:00',
                expected: {
                    original: {
                        start: '08:00',
                        end: '16:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                    copied: {
                        start: '16:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                },
            },
            {
                description: 'Multiple cuts scenario 1: (20:00-04:00) cut at 22:00 → 2h + 6h = 8h',
                parentShift: {
                    start: '20:00',
                    end: '04:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '22:00',
                expected: {
                    original: {
                        start: '20:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                    copied: {
                        start: '22:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Multiple cuts scenario 2: (22:00-04:00) already cut, cut at 01:00 → 3h + 3h = 6h',
                parentShift: {
                    start: '22:00',
                    end: '04:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 360,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 180,
                    },
                    copied: {
                        start: '01:00',
                        end: '04:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 180,
                    },
                },
            },
            {
                description: 'Unusual hours (11:15-19:45) cut at 15:30 → 4.25h + 4.25h = 8.5h',
                parentShift: {
                    start: '11:15',
                    end: '19:45',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 510,
                },
                cutTime: '15:30',
                expected: {
                    original: {
                        start: '11:15',
                        end: '15:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 255,
                    },
                    copied: {
                        start: '15:30',
                        end: '19:45',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 255,
                    },
                },
            },
            {
                description: 'Complex over midnight (17:45-01:15) cut at 23:15 → 5.5h + 2h = 7.5h',
                parentShift: {
                    start: '17:45',
                    end: '01:15',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 450,
                },
                cutTime: '23:15',
                expected: {
                    original: {
                        start: '17:45',
                        end: '23:15',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 330,
                    },
                    copied: {
                        start: '23:15',
                        end: '01:15',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: '3-shift rotation morning (06:00-14:00) cut at 10:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '10:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '10:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '10:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: '3-shift rotation afternoon (14:00-22:00) cut at 18:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '14:00',
                    end: '22:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '14:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '18:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: '3-shift rotation night (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Restaurant split shift (10:00-14:00) cut at 12:00 → 2h + 2h = 4h',
                parentShift: {
                    start: '10:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 240,
                },
                cutTime: '12:00',
                expected: {
                    original: {
                        start: '10:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                    copied: {
                        start: '12:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: 'Restaurant evening (17:00-23:00) cut at 20:00 → 3h + 3h = 6h',
                parentShift: {
                    start: '17:00',
                    end: '23:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 360,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '17:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 180,
                    },
                    copied: {
                        start: '20:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 180,
                    },
                },
            },
            {
                description: 'Healthcare 12h day (07:00-19:00) cut at 13:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '07:00',
                    end: '19:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '13:00',
                expected: {
                    original: {
                        start: '07:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '13:00',
                        end: '19:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Healthcare 12h night (19:00-07:00) cut at 01:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '19:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '19:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '01:00',
                        end: '07:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Security patrol (18:00-06:00) cut at 00:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '18:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '18:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '00:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Airport early shift (04:00-12:00) cut at 08:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '04:00',
                    end: '12:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '08:00',
                expected: {
                    original: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '08:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Airport late shift (16:00-00:30) cut at 20:00 → 4h + 4.5h = 8.5h',
                parentShift: {
                    start: '16:00',
                    end: '00:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 510,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '20:00',
                        end: '00:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 270,
                    },
                },
            },
            {
                description: 'Retail opening shift (07:30-15:30) cut at 11:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '07:30',
                    end: '15:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '11:30',
                expected: {
                    original: {
                        start: '07:30',
                        end: '11:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '11:30',
                        end: '15:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Retail closing shift (13:30-21:30) cut at 17:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '13:30',
                    end: '21:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '17:30',
                expected: {
                    original: {
                        start: '13:30',
                        end: '17:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '17:30',
                        end: '21:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Manufacturing rotating shift A (05:00-13:00) cut at 09:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '05:00',
                    end: '13:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '09:00',
                expected: {
                    original: {
                        start: '05:00',
                        end: '09:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '09:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Manufacturing rotating shift B (13:00-21:00) cut at 17:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '13:00',
                    end: '21:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '17:00',
                expected: {
                    original: {
                        start: '13:00',
                        end: '17:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '17:00',
                        end: '21:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Manufacturing rotating shift C (21:00-05:00) cut at 01:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '21:00',
                    end: '05:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '01:00',
                expected: {
                    original: {
                        start: '21:00',
                        end: '01:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '01:00',
                        end: '05:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Hotel reception day (08:00-16:00) cut at 12:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '08:00',
                    end: '16:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '12:00',
                expected: {
                    original: {
                        start: '08:00',
                        end: '12:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '12:00',
                        end: '16:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Hotel reception evening (16:00-00:00) cut at 20:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '16:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '20:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Hotel reception night (00:00-08:00) cut at 04:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '00:00',
                    end: '08:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '00:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '04:00',
                        end: '08:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Bakery early morning (03:00-11:00) cut at 07:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '03:00',
                    end: '11:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '07:00',
                expected: {
                    original: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '07:00',
                        end: '11:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Bakery overnight prep (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Call center late shift (15:00-23:00) cut at 19:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '15:00',
                    end: '23:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '19:00',
                expected: {
                    original: {
                        start: '15:00',
                        end: '19:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '19:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Call center overnight (23:00-07:00) cut at 03:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '23:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '03:00',
                expected: {
                    original: {
                        start: '23:00',
                        end: '03:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Emergency services 24h (06:00-06:00) cut at 18:00 → 12h + 12h = 24h',
                parentShift: {
                    start: '06:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 1440,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                    copied: {
                        start: '18:00',
                        end: '06:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 720,
                    },
                },
            },
            {
                description: 'Already over midnight 24h (18:00-06:00) cut at 00:00 → 6h + 6h = 12h',
                parentShift: {
                    start: '18:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 720,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '18:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '00:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 360,
                    },
                },
            },
            {
                description: 'Warehouse morning (05:30-13:30) cut at 09:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '05:30',
                    end: '13:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '09:30',
                expected: {
                    original: {
                        start: '05:30',
                        end: '09:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '09:30',
                        end: '13:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Warehouse evening (13:30-21:30) cut at 17:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '13:30',
                    end: '21:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '17:30',
                expected: {
                    original: {
                        start: '13:30',
                        end: '17:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '17:30',
                        end: '21:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Warehouse night (21:30-05:30) cut at 01:30 → 4h + 4h = 8h',
                parentShift: {
                    start: '21:30',
                    end: '05:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '01:30',
                expected: {
                    original: {
                        start: '21:30',
                        end: '01:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '01:30',
                        end: '05:30',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Transport driver day (06:00-14:00) cut at 10:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '10:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '10:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '10:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Transport driver evening (14:00-22:00) cut at 18:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '14:00',
                    end: '22:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '14:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '18:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Transport driver night (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Office standard (09:00-17:00) cut at 13:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '09:00',
                    end: '17:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '13:00',
                expected: {
                    original: {
                        start: '09:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '13:00',
                        end: '17:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Office flex early (07:00-15:00) cut at 11:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '07:00',
                    end: '15:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '11:00',
                expected: {
                    original: {
                        start: '07:00',
                        end: '11:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '11:00',
                        end: '15:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Office flex late (11:00-19:00) cut at 15:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '11:00',
                    end: '19:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '15:00',
                expected: {
                    original: {
                        start: '11:00',
                        end: '15:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '15:00',
                        end: '19:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Cinema matinee (10:00-18:00) cut at 14:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '10:00',
                    end: '18:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '14:00',
                expected: {
                    original: {
                        start: '10:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '14:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Cinema evening (16:00-00:30) cut at 20:00 → 4h + 4.5h = 8.5h',
                parentShift: {
                    start: '16:00',
                    end: '00:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 510,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '20:00',
                        end: '00:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 270,
                    },
                },
            },
            {
                description: 'Bar afternoon (16:00-00:00) cut at 20:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '16:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '20:00',
                expected: {
                    original: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '20:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Bar late night (20:00-04:00) cut at 00:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '20:00',
                    end: '04:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '20:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '00:00',
                        end: '04:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Club bouncer (22:00-06:00) cut at 02:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '02:00',
                expected: {
                    original: {
                        start: '22:00',
                        end: '02:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '02:00',
                        end: '06:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'IT maintenance window (02:00-06:00) cut at 04:00 → 2h + 2h = 4h',
                parentShift: {
                    start: '02:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 240,
                },
                cutTime: '04:00',
                expected: {
                    original: {
                        start: '02:00',
                        end: '04:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                    copied: {
                        start: '04:00',
                        end: '06:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 120,
                    },
                },
            },
            {
                description: 'IT overnight support (19:00-07:00) cut at 23:00 → 4h + 8h = 12h',
                parentShift: {
                    start: '19:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 720,
                },
                cutTime: '23:00',
                expected: {
                    original: {
                        start: '19:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '23:00',
                        end: '07:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 480,
                    },
                },
            },
            {
                description: 'Already over midnight IT support (23:00-07:00) cut at 03:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '23:00',
                    end: '07:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 480,
                },
                cutTime: '03:00',
                expected: {
                    original: {
                        start: '23:00',
                        end: '03:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '03:00',
                        end: '07:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Gym early bird (05:00-13:00) cut at 09:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '05:00',
                    end: '13:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '09:00',
                expected: {
                    original: {
                        start: '05:00',
                        end: '09:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '09:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Gym evening (15:00-23:00) cut at 19:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '15:00',
                    end: '23:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '19:00',
                expected: {
                    original: {
                        start: '15:00',
                        end: '19:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '19:00',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Pharmacy day (08:30-18:30) cut at 13:30 → 5h + 5h = 10h',
                parentShift: {
                    start: '08:30',
                    end: '18:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 600,
                },
                cutTime: '13:30',
                expected: {
                    original: {
                        start: '08:30',
                        end: '13:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                    copied: {
                        start: '13:30',
                        end: '18:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 300,
                    },
                },
            },
            {
                description: 'Pharmacy emergency (18:30-08:30) cut at 00:30 → 6h + 8h = 14h',
                parentShift: {
                    start: '18:30',
                    end: '08:30',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 840,
                },
                cutTime: '00:30',
                expected: {
                    original: {
                        start: '18:30',
                        end: '00:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 360,
                    },
                    copied: {
                        start: '00:30',
                        end: '08:30',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 480,
                    },
                },
            },
            {
                description: 'School janitor early (06:00-14:00) cut at 10:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '10:00',
                expected: {
                    original: {
                        start: '06:00',
                        end: '10:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '10:00',
                        end: '14:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'School janitor late (14:00-22:00) cut at 18:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '14:00',
                    end: '22:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '18:00',
                expected: {
                    original: {
                        start: '14:00',
                        end: '18:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '18:00',
                        end: '22:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Library morning (09:00-17:00) cut at 13:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '09:00',
                    end: '17:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '13:00',
                expected: {
                    original: {
                        start: '09:00',
                        end: '13:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '13:00',
                        end: '17:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Library evening (12:00-20:00) cut at 16:00 → 4h + 4h = 8h',
                parentShift: {
                    start: '12:00',
                    end: '20:00',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 480,
                },
                cutTime: '16:00',
                expected: {
                    original: {
                        start: '12:00',
                        end: '16:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                    copied: {
                        start: '16:00',
                        end: '20:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 240,
                    },
                },
            },
            {
                description: 'Minimum split case: 23:58 to 00:02 cut at 00:00 → 2min + 2min = 4min',
                parentShift: {
                    start: '23:58',
                    end: '00:02',
                    date: new Date('2025-01-01'),
                    expectedDurationMinutes: 4,
                },
                cutTime: '00:00',
                expected: {
                    original: {
                        start: '23:58',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 2,
                    },
                    copied: {
                        start: '00:00',
                        end: '00:02',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 2,
                    },
                },
            },
            {
                description: 'Edge case: Already cut (20:00-02:00) then (20:00-23:00) cut at 21:30 → 1.5h + 1.5h = 3h',
                parentShift: {
                    start: '20:00',
                    end: '23:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: false,
                    expectedDurationMinutes: 180,
                },
                cutTime: '21:30',
                expected: {
                    original: {
                        start: '20:00',
                        end: '21:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 90,
                    },
                    copied: {
                        start: '21:30',
                        end: '23:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 90,
                    },
                },
            },
            {
                description: 'Edge case: Already cut (20:00-02:00) then (23:00-02:00) cut at 00:30 → 1.5h + 1.5h = 3h',
                parentShift: {
                    start: '23:00',
                    end: '02:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                    expectedDurationMinutes: 180,
                },
                cutTime: '00:30',
                expected: {
                    original: {
                        start: '23:00',
                        end: '00:30',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                        expectedDurationMinutes: 90,
                    },
                    copied: {
                        start: '00:30',
                        end: '02:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: true,
                        expectedDurationMinutes: 90,
                    },
                },
            },
        ];

        testCases.forEach((testCase, index) => {
            it(`Test ${index + 1}: ${testCase.description}`, () => {
                // Setup
                const parentShift = new Shift();
                parentShift.id = 'parent-id';
                parentShift.startShift = testCase.parentShift.start;
                parentShift.endShift = testCase.parentShift.end;
                parentShift.fromDate = testCase.parentShift.date;
                parentShift.cuttingAfterMidnight =
                    testCase.parentShift.cuttingAfterMidnight || false;

                component['selectedShift'] = parentShift;
                component.cutTimeShift = OwnTime.forTime(testCase.cutTime.split(':')[0], testCase.cutTime.split(':')[1]);

                // Set up the 24h and over midnight flags
                const startMinutes = OwnTime.forTime(testCase.parentShift.start.split(':')[0], testCase.parentShift.start.split(':')[1]).toMinutes();
                const endMinutes = OwnTime.forTime(testCase.parentShift.end.split(':')[0], testCase.parentShift.end.split(':')[1]).toMinutes();
                component.is24Hours = startMinutes === endMinutes;
                component.isOverMidnight =
                    !component.is24Hours && endMinutes < startMinutes;

                let addedShift: Shift | undefined;
                mockDataService.addCutShift.mockImplementation((shift: Shift) => {
                    addedShift = shift;
                });

                // Execute
                component['performCutByTime']();

                // Helper function to normalize dates for comparison
                const normalizeDate = (date: Date | string | undefined): string => {
                    if (!date)
                        return '';
                    if (typeof date === 'string') {
                        return new Date(date).toDateString();
                    }
                    return date.toDateString();
                };

                // Assert original shift
                expect(parentShift.startShift).toBe(testCase.expected.original.start);
                expect(parentShift.endShift).toBe(testCase.expected.original.end);
                expect(normalizeDate(parentShift.fromDate)).toBe(testCase.expected.original.date.toDateString());
                expect(parentShift.cuttingAfterMidnight).toBe(testCase.expected.original.cuttingAfterMidnight);

                // Assert copied shift
                expect(addedShift).toBeDefined();
                expect(addedShift!.startShift).toBe(testCase.expected.copied.start);
                expect(addedShift!.endShift).toBe(testCase.expected.copied.end);
                expect(normalizeDate(addedShift!.fromDate)).toBe(testCase.expected.copied.date.toDateString());
                expect(addedShift!.cuttingAfterMidnight).toBe(testCase.expected.copied.cuttingAfterMidnight);
                expect(addedShift!.parentId).toBe(parentShift.id);

                // NEW: Assert duration calculations for shifts with expected durations
                if (testCase.parentShift.expectedDurationMinutes !== undefined) {
                    // Calculate actual durations
                    const originalActualDuration = calculateShiftDuration(parentShift.startShift, parentShift.endShift, parentShift.cuttingAfterMidnight);
                    const copiedActualDuration = calculateShiftDuration(addedShift!.startShift, addedShift!.endShift, addedShift!.cuttingAfterMidnight);
                    const totalActualDuration = originalActualDuration + copiedActualDuration;

                    // Log test data for report
                    console.log(`[TEST-DATA] Input: ${testCase.parentShift.start}-${testCase.parentShift.end}, Cut: ${testCase.cutTime}`);
                    console.log(`[TEST-DATA] Original: ${parentShift.startShift}-${parentShift.endShift} = ${originalActualDuration}min (expected: ${testCase.expected.original.expectedDurationMinutes}min)`);
                    console.log(`[TEST-DATA] Copied: ${addedShift!.startShift}-${addedShift!.endShift} = ${copiedActualDuration}min (expected: ${testCase.expected.copied.expectedDurationMinutes}min)`);
                    console.log(`[TEST-DATA] Total: ${totalActualDuration}min (expected: ${testCase.parentShift.expectedDurationMinutes}min)`);
                    console.log(`[TEST-DATA] CuttingAfterMidnight - Original: ${parentShift.cuttingAfterMidnight}, Copied: ${addedShift!.cuttingAfterMidnight}`);

                    // Assert original shift duration
                    if (testCase.expected.original.expectedDurationMinutes !== undefined) {
                        expect(originalActualDuration).toBe(testCase.expected.original.expectedDurationMinutes);
                    }

                    // Assert copied shift duration
                    if (testCase.expected.copied.expectedDurationMinutes !== undefined) {
                        expect(copiedActualDuration).toBe(testCase.expected.copied.expectedDurationMinutes);
                    }

                    // Assert total duration equals original parent duration
                    expect(totalActualDuration).toBe(testCase.parentShift.expectedDurationMinutes);
                }
            });
        });
    });

    describe('Cut Date Logic Tests', () => {
        interface CutDateTestCase {
            description: string;
            parentShift: {
                start: string;
                end: string;
                date: Date;
                cuttingAfterMidnight?: boolean;
            };
            cutDate: Date;
            expected: {
                original: {
                    start: string;
                    end: string;
                    date: Date;
                    cuttingAfterMidnight: boolean;
                };
                copied: {
                    start: string;
                    end: string;
                    date: Date;
                    cuttingAfterMidnight: boolean;
                };
            };
        }

        const cutDateTestCases: CutDateTestCase[] = [
            {
                description: 'Normal shift split by date - minimum 2 days (08:00-16:00) from 2025-01-01, cut at 2025-01-02',
                parentShift: {
                    start: '08:00',
                    end: '16:00',
                    date: new Date('2025-01-01'),
                },
                cutDate: new Date('2025-01-02'),
                expected: {
                    original: {
                        start: '08:00',
                        end: '16:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                    },
                    copied: {
                        start: '08:00',
                        end: '16:00',
                        date: new Date('2025-01-02'),
                        cuttingAfterMidnight: false,
                    },
                },
            },
            {
                description: 'Over-midnight shift split after 3 days (22:00-06:00) from 2025-01-01, cut at 2025-01-04',
                parentShift: {
                    start: '22:00',
                    end: '06:00',
                    date: new Date('2025-01-01'),
                    cuttingAfterMidnight: true,
                },
                cutDate: new Date('2025-01-04'),
                expected: {
                    original: {
                        start: '22:00',
                        end: '06:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: true,
                    },
                    copied: {
                        start: '22:00',
                        end: '06:00',
                        date: new Date('2025-01-04'),
                        cuttingAfterMidnight: true,
                    },
                },
            },
            {
                description: '24h shift split after 7 days (00:00-00:00) from 2025-01-01, cut at 2025-01-08',
                parentShift: {
                    start: '00:00',
                    end: '00:00',
                    date: new Date('2025-01-01'),
                },
                cutDate: new Date('2025-01-08'),
                expected: {
                    original: {
                        start: '00:00',
                        end: '00:00',
                        date: new Date('2025-01-01'),
                        cuttingAfterMidnight: false,
                    },
                    copied: {
                        start: '00:00',
                        end: '00:00',
                        date: new Date('2025-01-08'),
                        cuttingAfterMidnight: false,
                    },
                },
            },
        ];

        cutDateTestCases.forEach((testCase, index) => {
            it(`Cut Date Test ${index + 1}: ${testCase.description}`, () => {
                // Setup
                const parentShift = new Shift();
                parentShift.id = 'parent-id';
                parentShift.startShift = testCase.parentShift.start;
                parentShift.endShift = testCase.parentShift.end;
                parentShift.fromDate = testCase.parentShift.date;
                parentShift.cuttingAfterMidnight =
                    testCase.parentShift.cuttingAfterMidnight || false;

                component['selectedShift'] = parentShift;
                component.cutDate = transformDateToNgbDateStruct(testCase.cutDate) as any;

                let addedShift: Shift | undefined;
                mockDataService.addCutShift.mockImplementation((shift: Shift) => {
                    addedShift = shift;
                });

                // Execute
                component['performCutByDate']();

                // Helper function to normalize dates for comparison
                const normalizeDate = (date: Date | string | undefined): string => {
                    if (!date)
                        return '';
                    if (typeof date === 'string') {
                        return new Date(date).toDateString();
                    }
                    return date.toDateString();
                };

                // Assert original shift (should remain unchanged)
                expect(parentShift.startShift).toBe(testCase.expected.original.start);
                expect(parentShift.endShift).toBe(testCase.expected.original.end);
                expect(normalizeDate(parentShift.fromDate)).toBe(testCase.expected.original.date.toDateString());
                expect(parentShift.cuttingAfterMidnight).toBe(testCase.expected.original.cuttingAfterMidnight);

                // Assert copied shift
                expect(addedShift).toBeDefined();
                expect(addedShift!.startShift).toBe(testCase.expected.copied.start);
                expect(addedShift!.endShift).toBe(testCase.expected.copied.end);
                expect(normalizeDate(addedShift!.fromDate)).toBe(testCase.expected.copied.date.toDateString());
                expect(addedShift!.cuttingAfterMidnight).toBe(testCase.expected.copied.cuttingAfterMidnight);
                expect(addedShift!.parentId).toBe(parentShift.id);
            });
        });
    });

    describe('Cut Staff Logic Tests', () => {
        interface CutStaffTestCase {
            description: string;
            parentShift: {
                start: string;
                end: string;
                date: Date;
                sumEmployees: number;
            };
            staffCountToCut: number;
            expected: {
                original: {
                    sumEmployees: number;
                };
                copied: {
                    sumEmployees: number;
                };
            };
        }

        const cutStaffTestCases: CutStaffTestCase[] = [
            {
                description: 'Split 10 employees: 7 original + 3 copied',
                parentShift: {
                    start: '08:00',
                    end: '16:00',
                    date: new Date('2025-01-01'),
                    sumEmployees: 10,
                },
                staffCountToCut: 3,
                expected: {
                    original: { sumEmployees: 7 },
                    copied: { sumEmployees: 3 },
                },
            },
            {
                description: 'Split 5 employees: 3 original + 2 copied',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    sumEmployees: 5,
                },
                staffCountToCut: 2,
                expected: {
                    original: { sumEmployees: 3 },
                    copied: { sumEmployees: 2 },
                },
            },
            {
                description: 'Split 2 employees: 1 original + 1 copied (minimum split)',
                parentShift: {
                    start: '09:00',
                    end: '17:00',
                    date: new Date('2025-01-01'),
                    sumEmployees: 2,
                },
                staffCountToCut: 1,
                expected: {
                    original: { sumEmployees: 1 },
                    copied: { sumEmployees: 1 },
                },
            },
            {
                description: 'Split 50 employees: 30 original + 20 copied (large team)',
                parentShift: {
                    start: '07:00',
                    end: '19:00',
                    date: new Date('2025-01-01'),
                    sumEmployees: 50,
                },
                staffCountToCut: 20,
                expected: {
                    original: { sumEmployees: 30 },
                    copied: { sumEmployees: 20 },
                },
            },
        ];

        cutStaffTestCases.forEach((testCase, index) => {
            it(`Cut Staff Test ${index + 1}: ${testCase.description}`, () => {
                // Setup
                const parentShift = new Shift();
                parentShift.id = 'parent-id';
                parentShift.startShift = testCase.parentShift.start;
                parentShift.endShift = testCase.parentShift.end;
                parentShift.fromDate = testCase.parentShift.date;
                parentShift.sumEmployees = testCase.parentShift.sumEmployees;

                component['selectedShift'] = parentShift;
                component.staffCount = testCase.staffCountToCut;

                let addedShift: Shift | undefined;
                mockDataService.addCutShift.mockImplementation((shift: Shift) => {
                    addedShift = shift;
                });

                // Execute
                component['performCutByStaff']();

                // Assert original shift staff count
                expect(parentShift.sumEmployees).toBe(testCase.expected.original.sumEmployees);

                // Assert copied shift
                expect(addedShift).toBeDefined();
                expect(addedShift!.sumEmployees).toBe(testCase.expected.copied.sumEmployees);
                expect(addedShift!.parentId).toBe(parentShift.id);

                // Assert total staff count is preserved
                const totalStaff = parentShift.sumEmployees + addedShift!.sumEmployees;
                expect(totalStaff).toBe(testCase.parentShift.sumEmployees);
            });
        });
    });

    describe('Cut Task Logic Tests', () => {
        interface CutTaskTestCase {
            description: string;
            parentShift: {
                start: string;
                end: string;
                date: Date;
                quantity: number;
            };
            taskCountToCut: number;
            expected: {
                original: {
                    quantity: number;
                };
                copied: {
                    quantity: number;
                };
            };
        }

        const cutTaskTestCases: CutTaskTestCase[] = [
            {
                description: 'Split 20 tasks: 15 original + 5 copied',
                parentShift: {
                    start: '08:00',
                    end: '16:00',
                    date: new Date('2025-01-01'),
                    quantity: 20,
                },
                taskCountToCut: 5,
                expected: {
                    original: { quantity: 15 },
                    copied: { quantity: 5 },
                },
            },
            {
                description: 'Split 10 tasks: 7 original + 3 copied',
                parentShift: {
                    start: '06:00',
                    end: '14:00',
                    date: new Date('2025-01-01'),
                    quantity: 10,
                },
                taskCountToCut: 3,
                expected: {
                    original: { quantity: 7 },
                    copied: { quantity: 3 },
                },
            },
            {
                description: 'Split 2 tasks: 1 original + 1 copied (minimum split)',
                parentShift: {
                    start: '09:00',
                    end: '17:00',
                    date: new Date('2025-01-01'),
                    quantity: 2,
                },
                taskCountToCut: 1,
                expected: {
                    original: { quantity: 1 },
                    copied: { quantity: 1 },
                },
            },
            {
                description: 'Split 100 tasks: 75 original + 25 copied (large quantity)',
                parentShift: {
                    start: '07:00',
                    end: '19:00',
                    date: new Date('2025-01-01'),
                    quantity: 100,
                },
                taskCountToCut: 25,
                expected: {
                    original: { quantity: 75 },
                    copied: { quantity: 25 },
                },
            },
        ];

        cutTaskTestCases.forEach((testCase, index) => {
            it(`Cut Task Test ${index + 1}: ${testCase.description}`, () => {
                // Setup
                const parentShift = new Shift();
                parentShift.id = 'parent-id';
                parentShift.startShift = testCase.parentShift.start;
                parentShift.endShift = testCase.parentShift.end;
                parentShift.fromDate = testCase.parentShift.date;
                parentShift.quantity = testCase.parentShift.quantity;

                component['selectedShift'] = parentShift;
                component.taskCount = testCase.taskCountToCut;

                let addedShift: Shift | undefined;
                mockDataService.addCutShift.mockImplementation((shift: Shift) => {
                    addedShift = shift;
                });

                // Execute
                component['performCutByTask']();

                // Assert original shift task count
                expect(parentShift.quantity).toBe(testCase.expected.original.quantity);

                // Assert copied shift
                expect(addedShift).toBeDefined();
                expect(addedShift!.quantity).toBe(testCase.expected.copied.quantity);
                expect(addedShift!.parentId).toBe(parentShift.id);

                // Assert total task count is preserved
                const totalTasks = parentShift.quantity + addedShift!.quantity;
                expect(totalTasks).toBe(testCase.parentShift.quantity);
            });
        });
    });

    describe('ValidateAndCorrectTime Logic Tests', () => {
        interface ValidateTimeTestCase {
            description: string;
            shiftSetup: {
                start: string;
                end: string;
                isOverMidnight: boolean;
                is24Hours: boolean;
            };
            userInput: string;
            expected: {
                correctedTime: string;
                wasChanged: boolean;
            };
        }

        const validateTimeTestCases: ValidateTimeTestCase[] = [
            // Normal Shift Tests (07:00-15:00)
            {
                description: 'Normal shift (07:00-15:00): User enters 16:00 → corrected to 14:59',
                shiftSetup: {
                    start: '07:00',
                    end: '15:00',
                    isOverMidnight: false,
                    is24Hours: false,
                },
                userInput: '16:00',
                expected: { correctedTime: '14:59', wasChanged: true },
            },
            {
                description: 'Normal shift (07:00-15:00): User enters 06:00 → corrected to 07:01',
                shiftSetup: {
                    start: '07:00',
                    end: '15:00',
                    isOverMidnight: false,
                    is24Hours: false,
                },
                userInput: '06:00',
                expected: { correctedTime: '07:01', wasChanged: true },
            },
            {
                description: 'Normal shift (07:00-15:00): User enters 07:00 → corrected to 07:01',
                shiftSetup: {
                    start: '07:00',
                    end: '15:00',
                    isOverMidnight: false,
                    is24Hours: false,
                },
                userInput: '07:00',
                expected: { correctedTime: '07:01', wasChanged: true },
            },
            {
                description: 'Normal shift (07:00-15:00): User enters 15:00 → corrected to 14:59',
                shiftSetup: {
                    start: '07:00',
                    end: '15:00',
                    isOverMidnight: false,
                    is24Hours: false,
                },
                userInput: '15:00',
                expected: { correctedTime: '14:59', wasChanged: true },
            },
            {
                description: 'Normal shift (07:00-15:00): User enters 10:00 → valid, no change',
                shiftSetup: {
                    start: '07:00',
                    end: '15:00',
                    isOverMidnight: false,
                    is24Hours: false,
                },
                userInput: '10:00',
                expected: { correctedTime: '10:00', wasChanged: false },
            },

            // Over-Midnight Shift Tests (23:00-07:00)
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 08:00 → corrected to 07:00 (closer to end)',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '08:00',
                expected: { correctedTime: '07:00', wasChanged: true },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 15:00 → corrected to 23:00 (closer to start)',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '15:00',
                expected: { correctedTime: '23:00', wasChanged: true },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 22:00 → corrected to 23:00 (closer to start)',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '22:00',
                expected: { correctedTime: '23:00', wasChanged: true },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 23:30 → valid, no change',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '23:30',
                expected: { correctedTime: '23:30', wasChanged: false },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 02:00 → valid, no change',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '02:00',
                expected: { correctedTime: '02:00', wasChanged: false },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 23:00 → valid, no change (start allowed)',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '23:00',
                expected: { correctedTime: '23:00', wasChanged: false },
            },
            {
                description: 'Over-midnight shift (23:00-07:00): User enters 07:00 → valid, no change (end allowed)',
                shiftSetup: {
                    start: '23:00',
                    end: '07:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '07:00',
                expected: { correctedTime: '07:00', wasChanged: false },
            },

            // 24h Shift Tests (00:00-00:00)
            {
                description: '24h shift (00:00-00:00): User enters 00:00 → corrected to 00:01 (exact start not allowed)',
                shiftSetup: {
                    start: '00:00',
                    end: '00:00',
                    isOverMidnight: false,
                    is24Hours: true,
                },
                userInput: '00:00',
                expected: { correctedTime: '00:01', wasChanged: true },
            },
            {
                description: '24h shift (00:00-00:00): User enters 12:00 → valid, no change',
                shiftSetup: {
                    start: '00:00',
                    end: '00:00',
                    isOverMidnight: false,
                    is24Hours: true,
                },
                userInput: '12:00',
                expected: { correctedTime: '12:00', wasChanged: false },
            },
            {
                description: '24h shift (00:00-00:00): User enters 23:59 → valid, no change',
                shiftSetup: {
                    start: '00:00',
                    end: '00:00',
                    isOverMidnight: false,
                    is24Hours: true,
                },
                userInput: '23:59',
                expected: { correctedTime: '23:59', wasChanged: false },
            },

            // 24h Shift with different start time (08:00-08:00)
            {
                description: '24h shift (08:00-08:00): User enters 08:00 → corrected to 08:01 (exact start not allowed)',
                shiftSetup: {
                    start: '08:00',
                    end: '08:00',
                    isOverMidnight: false,
                    is24Hours: true,
                },
                userInput: '08:00',
                expected: { correctedTime: '08:01', wasChanged: true },
            },

            // Edge cases with Over-Midnight
            {
                description: 'Over-midnight shift (20:00-04:00): User enters 10:00 → corrected to 04:00 (closer to end)',
                shiftSetup: {
                    start: '20:00',
                    end: '04:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '10:00',
                expected: { correctedTime: '04:00', wasChanged: true },
            },
            {
                description: 'Over-midnight shift (20:00-04:00): User enters 19:00 → corrected to 20:00 (closer to start)',
                shiftSetup: {
                    start: '20:00',
                    end: '04:00',
                    isOverMidnight: true,
                    is24Hours: false,
                },
                userInput: '19:00',
                expected: { correctedTime: '20:00', wasChanged: true },
            },
        ];

        validateTimeTestCases.forEach((testCase, index) => {
            it(`Validate Time Test ${index + 1}: ${testCase.description}`, () => {
                // Setup component state to simulate shift configuration
                const startTimeStruct = transformStringToOwnTimeStruct(testCase.shiftSetup.start);
                const endTimeStruct = transformStringToOwnTimeStruct(testCase.shiftSetup.end);

                component['minTimeShift'] = startTimeStruct;
                component['maxTimeShift'] = endTimeStruct;
                component['isOverMidnight'] = testCase.shiftSetup.isOverMidnight;
                component['is24Hours'] = testCase.shiftSetup.is24Hours;

                // Set user input time
                component['cutTimeShift'] = transformStringToOwnTimeStruct(testCase.userInput);
                const originalTime = `${component['cutTimeShift'].hours}:${component['cutTimeShift'].minutes.padStart(2, '0')}`;

                // Execute validation
                component['validateAndCorrectTime']();

                // Check result
                const resultTime = `${component['cutTimeShift'].hours}:${component['cutTimeShift'].minutes.padStart(2, '0')}`;

                expect(resultTime).toBe(testCase.expected.correctedTime);

                const actualWasChanged = originalTime !== resultTime;
                expect(actualWasChanged).toBe(testCase.expected.wasChanged);

                // Log for debugging
                if (!testCase.expected.wasChanged) {
                    // console.log(`✅ ${testCase.description}`);
                    // console.log(`   Input: ${originalTime}, Result: ${resultTime} (no change expected)`);
                }
                else {
                    // console.log(`🔧 ${testCase.description}`);
                    // console.log(`   Input: ${originalTime}, Corrected to: ${resultTime}`);
                }
            });
        });
    });

    describe('Auto-Selection of Child Cut Tests', () => {
        let parentShift: Shift;

        beforeEach(() => {
            // Create a parent shift for testing
            parentShift = new Shift();
            parentShift.id = 'parent-123';
            parentShift.name = 'Parent Shift';
            parentShift.startShift = '08:00';
            parentShift.endShift = '16:00';
            parentShift.fromDate = new Date('2025-01-01');
            parentShift.quantity = 10;
            parentShift.sumEmployees = 5;

            // Set up the component with the parent shift
            component['selectedShift'] = parentShift;
        });

        it('should auto-select new child cut after cut by time', () => {
            // Arrange
            component['cutTimeShift'] = transformStringToOwnTimeStruct('12:00');
            const originalSelectedShiftId = component['selectedShift']?.id;

            // Act
            component['performCutByTime']();

            // Assert
            const newSelectedShift = component['selectedShift'];
            expect(newSelectedShift).toBeDefined();
            expect(newSelectedShift!.id).not.toBe(originalSelectedShiftId); // Should be different from parent
            expect(newSelectedShift!.parentId).toBe(originalSelectedShiftId); // Should reference parent
            expect(newSelectedShift!.isNew).toBe(true); // Should be marked as new
            expect(newSelectedShift!.startShift).toBe('12:00'); // Should start at cut time
            expect(newSelectedShift!.endShift).toBe('16:00'); // Should end at original end time
        });

        it('should auto-select new child cut after cut by date', () => {
            // Arrange
            const ngbDateStruct = transformDateToNgbDateStruct(new Date('2025-01-03'));
            const cutDate = ngbDateStruct ? NgbDate.from(ngbDateStruct) : null;
            component['cutDate'] = cutDate;
            const originalSelectedShiftId = component['selectedShift']?.id;

            // Act
            component['performCutByDate']();

            // Assert
            const newSelectedShift = component['selectedShift'];
            expect(newSelectedShift).toBeDefined();
            expect(newSelectedShift!.id).not.toBe(originalSelectedShiftId); // Should be different from parent
            expect(newSelectedShift!.parentId).toBe(originalSelectedShiftId); // Should reference parent
            expect(newSelectedShift!.isNew).toBe(true); // Should be marked as new

            // Compare dates by converting to date strings to avoid timezone issues
            const expectedDate = new Date('2025-01-03');
            expect(newSelectedShift!.fromDate?.toDateString()).toBe(expectedDate.toDateString()); // Should start at cut date
        });

        it('should auto-select new child cut after cut by staff', () => {
            // Arrange
            component['staffCount'] = 2; // Cut 2 employees
            const originalSelectedShiftId = component['selectedShift']?.id;

            // Act
            component['performCutByStaff']();

            // Assert
            const newSelectedShift = component['selectedShift'];
            expect(newSelectedShift).toBeDefined();
            expect(newSelectedShift!.id).not.toBe(originalSelectedShiftId); // Should be different from parent
            expect(newSelectedShift!.parentId).toBe(originalSelectedShiftId); // Should reference parent
            expect(newSelectedShift!.isNew).toBe(true); // Should be marked as new
            expect(newSelectedShift!.sumEmployees).toBe(2); // Should have cut staff count

            // Parent should have reduced staff count
            expect(parentShift.sumEmployees).toBe(3); // 5 - 2 = 3
        });

        it('should auto-select new child cut after cut by task', () => {
            // Arrange
            component['taskCount'] = 4; // Cut 4 tasks
            const originalSelectedShiftId = component['selectedShift']?.id;

            // Act
            component['performCutByTask']();

            // Assert
            const newSelectedShift = component['selectedShift'];
            expect(newSelectedShift).toBeDefined();
            expect(newSelectedShift!.id).not.toBe(originalSelectedShiftId); // Should be different from parent
            expect(newSelectedShift!.parentId).toBe(originalSelectedShiftId); // Should reference parent
            expect(newSelectedShift!.isNew).toBe(true); // Should be marked as new
            expect(newSelectedShift!.quantity).toBe(4); // Should have cut task count

            // Parent should have reduced task count
            expect(parentShift.quantity).toBe(6); // 10 - 4 = 6
        });

        it('should analyze cut possibilities for the newly selected child cut', () => {
            // Arrange
            vi.spyOn(component as any, 'analyzeShift');

            component['cutTimeShift'] = transformStringToOwnTimeStruct('12:00');

            // Act
            component['performCutByTime']();

            // Assert - analyzeShift should be called for the new child cut
            expect(component['analyzeShift']).toHaveBeenCalled();
        });
    });
});
