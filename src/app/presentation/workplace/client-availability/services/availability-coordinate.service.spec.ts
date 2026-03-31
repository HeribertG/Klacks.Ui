// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { AvailabilityCoordinateService } from './availability-coordinate.service';

describe('AvailabilityCoordinateService', () => {
    let service: AvailabilityCoordinateService;
    let originalDir: string;

    const CELL_WIDTH = 10;
    const VIEWPORT_WIDTH = 500;
    const TOTAL_COLUMNS = 365;

    beforeEach(() => {
        originalDir = document.documentElement.dir;
        service = new AvailabilityCoordinateService();
        service.update(CELL_WIDTH, VIEWPORT_WIDTH, TOTAL_COLUMNS);
    });

    afterEach(() => {
        document.documentElement.dir = originalDir;
    });

    describe('LTR', () => {
        beforeEach(() => {
            document.documentElement.dir = 'ltr';
        });

        it('should report isRtl as false', () => {
            expect(service.isRtl).toBe(false);
        });

        it('cellX should return visibleCol * cellWidth', () => {
            expect(service.cellX(0)).toBe(0);
            expect(service.cellX(5)).toBe(50);
        });

        it('spanX should return visibleCol * cellWidth', () => {
            expect(service.spanX(3, 4)).toBe(30);
        });

        it('spanWidth should return spanCols * cellWidth', () => {
            expect(service.spanWidth(7)).toBe(70);
        });

        it('headerScrollOffset should return negative scrollX', () => {
            expect(service.headerScrollOffset(100)).toBe(-100);
        });

        it('absoluteColX should return col * cellWidth - scrollX', () => {
            expect(service.absoluteColX(10, 50)).toBe(50);
        });

        it('absoluteSpanX should return col * cellWidth - scrollX', () => {
            expect(service.absoluteSpanX(10, 3, 50)).toBe(50);
        });

        it('mouseToAbsoluteX should return mouseX + scrollX', () => {
            expect(service.mouseToAbsoluteX(100, 200)).toBe(300);
        });

        it('mouseToColumn should map pixel + scroll to column', () => {
            expect(service.mouseToColumn(50, 100)).toBe(15);
        });
    });

    describe('RTL', () => {
        beforeEach(() => {
            document.documentElement.dir = 'rtl';
        });

        it('should report isRtl as true', () => {
            expect(service.isRtl).toBe(true);
        });

        it('cellX should place visibleCol 0 at right edge', () => {
            expect(service.cellX(0)).toBe(VIEWPORT_WIDTH - CELL_WIDTH);
        });

        it('cellX should decrease as visibleCol increases', () => {
            expect(service.cellX(0)).toBeGreaterThan(service.cellX(10));
        });

        it('spanX should shift left by span columns', () => {
            expect(service.spanX(3, 4)).toBe(VIEWPORT_WIDTH - 7 * CELL_WIDTH);
        });

        it('spanWidth should be direction-independent', () => {
            document.documentElement.dir = 'ltr';
            const ltrWidth = service.spanWidth(7);
            document.documentElement.dir = 'rtl';
            expect(service.spanWidth(7)).toBe(ltrWidth);
        });

        it('headerScrollOffset should mirror from right', () => {
            const totalWidth = TOTAL_COLUMNS * CELL_WIDTH;
            const scrollX = 100;
            expect(service.headerScrollOffset(scrollX)).toBe(VIEWPORT_WIDTH - totalWidth + scrollX);
        });

        it('absoluteColX should position from right with scroll', () => {
            const scrollX = 50;
            expect(service.absoluteColX(10, scrollX)).toBe(VIEWPORT_WIDTH - 11 * CELL_WIDTH + scrollX);
        });

        it('absoluteSpanX should shift left by span columns', () => {
            const scrollX = 50;
            expect(service.absoluteSpanX(10, 3, scrollX)).toBe(VIEWPORT_WIDTH - 13 * CELL_WIDTH + scrollX);
        });

        it('mouseToAbsoluteX should mirror from total width', () => {
            const totalWidth = TOTAL_COLUMNS * CELL_WIDTH;
            expect(service.mouseToAbsoluteX(100, 200)).toBe(totalWidth - 301);
        });

        it('mouseToColumn should map from right edge with scroll', () => {
            expect(service.mouseToColumn(VIEWPORT_WIDTH, 0)).toBe(0);
            expect(service.mouseToColumn(VIEWPORT_WIDTH - 55, 100)).toBe(15);
        });
    });

    describe('LTR/RTL symmetry', () => {
        it('adjacent cellX values should differ by exactly cellWidth', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                expect(Math.abs(service.cellX(5) - service.cellX(4))).toBe(CELL_WIDTH);
            }
        });

        it('spanX with span=1 should equal cellX', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                expect(service.spanX(5, 1)).toBe(service.cellX(5));
            }
        });
    });
});
