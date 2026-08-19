// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TimeRangeService } from './time-range.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';

describe('TimeRangeService', () => {
    let service: TimeRangeService;

    const shiftWith = (start?: string, end?: string): IShift =>
        ({ startShift: start, endShift: end }) as unknown as IShift;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimeRangeService);
    });

    describe('getShiftEndMinutes', () => {
        it('should span a full day when start equals end', () => {
            const shift = shiftWith('07:00:00', '07:00:00');

            expect(service.getShiftStartMinutes(shift)).toBe(420);
            expect(service.getShiftEndMinutes(shift)).toBe(420 + 1440);
        });

        it('should span a full day for midnight to midnight', () => {
            const shift = shiftWith('00:00:00', '00:00:00');

            expect(service.getShiftEndMinutes(shift)).toBe(1440);
        });

        it('should wrap past midnight', () => {
            const shift = shiftWith('22:00:00', '06:00:00');

            expect(service.getShiftEndMinutes(shift)).toBe(360 + 1440);
        });

        it('should leave an ordinary span untouched', () => {
            const shift = shiftWith('08:00:00', '15:30:00');

            expect(service.getShiftEndMinutes(shift)).toBe(930);
        });
    });

    describe('agreement with calculateDuration', () => {
        it('should not contradict calculateDuration on equal bounds', () => {
            const shift = shiftWith('07:00:00', '07:00:00');
            const spanMinutes =
                service.getShiftEndMinutes(shift) - service.getShiftStartMinutes(shift);

            expect(spanMinutes).toBe(1440);
        });
    });

    describe('hasExplicitTimes', () => {
        it('should be true for a set pair, including 00:00-00:00', () => {
            expect(service.hasExplicitTimes(shiftWith('00:00:00', '00:00:00'))).toBe(true);
            expect(service.hasExplicitTimes(shiftWith('07:00:00', '15:00:00'))).toBe(true);
        });

        it('should be false when a bound is missing', () => {
            expect(service.hasExplicitTimes(shiftWith(undefined, '15:00:00'))).toBe(false);
            expect(service.hasExplicitTimes(shiftWith('07:00:00', undefined))).toBe(false);
            expect(service.hasExplicitTimes(shiftWith(undefined, undefined))).toBe(false);
        });

        it('should be false when a bound cannot be parsed', () => {
            expect(service.hasExplicitTimes(shiftWith('not-a-time', '15:00:00'))).toBe(false);
        });

        it('should distinguish an unset pair from a deliberate midnight pair', () => {
            expect(service.hasExplicitTimes(shiftWith(undefined, undefined))).toBe(false);
            expect(service.hasExplicitTimes(shiftWith('00:00:00', '00:00:00'))).toBe(true);
        });
    });
});
