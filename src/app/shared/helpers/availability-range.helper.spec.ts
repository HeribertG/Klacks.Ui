// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { parseAvailabilityRanges } from './availability-range.helper';

describe('Availability Range Helper', () => {
    it('should parse an ordinary range', () => {
        expect(parseAvailabilityRanges('08:00-12:00')).toEqual([
            { startMinutes: 480, endMinutes: 720 },
        ]);
    });

    it('should parse several ranges', () => {
        expect(parseAvailabilityRanges('08:00-12:00,13:00-17:00')).toEqual([
            { startMinutes: 480, endMinutes: 720 },
            { startMinutes: 780, endMinutes: 1020 },
        ]);
    });

    it('should split a range crossing midnight instead of discarding it', () => {
        expect(parseAvailabilityRanges('22:00-06:00')).toEqual([
            { startMinutes: 1320, endMinutes: 1440 },
            { startMinutes: 0, endMinutes: 360 },
        ]);
    });

    it('should treat equal bounds as the whole day', () => {
        expect(parseAvailabilityRanges('06:00-06:00')).toEqual([
            { startMinutes: 0, endMinutes: 1440 },
        ]);
    });

    it('should treat midnight to midnight as the whole day', () => {
        expect(parseAvailabilityRanges('00:00-00:00')).toEqual([
            { startMinutes: 0, endMinutes: 1440 },
        ]);
    });

    it('should tolerate seconds and surrounding whitespace', () => {
        expect(parseAvailabilityRanges(' 08:00:00-12:00:00 ')).toEqual([
            { startMinutes: 480, endMinutes: 720 },
        ]);
    });

    it('should return nothing for missing or malformed input', () => {
        expect(parseAvailabilityRanges(undefined)).toEqual([]);
        expect(parseAvailabilityRanges('')).toEqual([]);
        expect(parseAvailabilityRanges('08:00')).toEqual([]);
    });
});
