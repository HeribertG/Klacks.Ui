// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { GanttCoordinateService } from './gantt-coordinate.service';

describe('GanttCoordinateService', () => {
    let service: GanttCoordinateService;
    let originalDir: string;

    const CELL_WIDTH = 10;
    const VIEWPORT_WIDTH = 500;
    const TOTAL_DAYS = 365;
    const SCROLL_POS = 20;

    beforeEach(() => {
        originalDir = document.documentElement.dir;
        service = new GanttCoordinateService();
        service.update(CELL_WIDTH, VIEWPORT_WIDTH, TOTAL_DAYS, SCROLL_POS);
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

        it('scrollDx should be negative scroll offset', () => {
            expect(service.scrollDx).toBe(-SCROLL_POS * CELL_WIDTH);
        });

        it('columnX should return col * cellWidth', () => {
            expect(service.columnX(0)).toBe(0);
            expect(service.columnX(10)).toBe(100);
            expect(service.columnX(364)).toBe(3640);
        });

        it('columnRight should return columnX + cellWidth', () => {
            expect(service.columnRight(0)).toBe(10);
            expect(service.columnRight(10)).toBe(110);
        });

        it('spanLeft should return columnX of startCol', () => {
            expect(service.spanLeft(5, 15)).toBe(50);
        });

        it('spanRight should return columnRight of endCol', () => {
            expect(service.spanRight(5, 15)).toBe(160);
        });

        it('mouseToColumn should map pixel to column + scrollPos', () => {
            expect(service.mouseToColumn(0)).toBe(SCROLL_POS);
            expect(service.mouseToColumn(55)).toBe(25);
        });

        it('pixelDeltaToColumnDelta should return positive for positive delta', () => {
            expect(service.pixelDeltaToColumnDelta(30)).toBe(3);
            expect(service.pixelDeltaToColumnDelta(-30)).toBe(-3);
        });
    });

    describe('RTL', () => {
        beforeEach(() => {
            document.documentElement.dir = 'rtl';
        });

        it('should report isRtl as true', () => {
            expect(service.isRtl).toBe(true);
        });

        it('scrollDx should mirror from right edge', () => {
            const totalWidth = TOTAL_DAYS * CELL_WIDTH;
            expect(service.scrollDx).toBe(VIEWPORT_WIDTH - totalWidth + SCROLL_POS * CELL_WIDTH);
        });

        it('columnX should place col 0 at rightmost position', () => {
            const totalWidth = TOTAL_DAYS * CELL_WIDTH;
            expect(service.columnX(0)).toBe(totalWidth - CELL_WIDTH);
        });

        it('columnX should place last col at position 0', () => {
            expect(service.columnX(TOTAL_DAYS - 1)).toBe(0);
        });

        it('columnX should decrease as col increases', () => {
            expect(service.columnX(10)).toBeGreaterThan(service.columnX(100));
        });

        it('columnRight should return columnX + cellWidth', () => {
            const totalWidth = TOTAL_DAYS * CELL_WIDTH;
            expect(service.columnRight(0)).toBe(totalWidth);
        });

        it('spanLeft should return columnX of endCol (leftmost visually)', () => {
            expect(service.spanLeft(5, 15)).toBe(service.columnX(15));
        });

        it('spanRight should return columnRight of startCol (rightmost visually)', () => {
            expect(service.spanRight(5, 15)).toBe(service.columnRight(5));
        });

        it('span should cover correct pixel width', () => {
            const left = service.spanLeft(5, 15);
            const right = service.spanRight(5, 15);
            expect(right - left).toBe(11 * CELL_WIDTH);
        });

        it('mouseToColumn should map from right edge', () => {
            expect(service.mouseToColumn(VIEWPORT_WIDTH)).toBe(SCROLL_POS);
            expect(service.mouseToColumn(VIEWPORT_WIDTH - 55)).toBe(25);
        });

        it('pixelDeltaToColumnDelta should invert direction', () => {
            expect(service.pixelDeltaToColumnDelta(30)).toBe(-3);
            expect(service.pixelDeltaToColumnDelta(-30)).toBe(3);
        });
    });

    describe('LTR/RTL symmetry', () => {
        it('columnRight - columnX should always equal cellWidth', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                for (const col of [0, 50, 364]) {
                    expect(service.columnRight(col) - service.columnX(col)).toBe(CELL_WIDTH);
                }
            }
        });

        it('spanRight - spanLeft should equal (endCol - startCol + 1) * cellWidth', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                const left = service.spanLeft(10, 20);
                const right = service.spanRight(10, 20);
                expect(right - left).toBe(11 * CELL_WIDTH);
            }
        });
    });
});
