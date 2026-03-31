// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { GridCoordinateService } from './grid-coordinate.service';

describe('GridCoordinateService', () => {
    let service: GridCoordinateService;
    let originalDir: string;

    const CELL_WIDTH = 10;
    const RENDER_CANVAS_WIDTH = 520;
    const VIEWPORT_WIDTH = 500;
    const TOTAL_COLUMNS = 50;
    const SCROLL_POS = 5;

    beforeEach(() => {
        originalDir = document.documentElement.dir;
        service = new GridCoordinateService();
        service.update(CELL_WIDTH, RENDER_CANVAS_WIDTH, VIEWPORT_WIDTH, TOTAL_COLUMNS, SCROLL_POS);
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

        it('firstVisibleCol should equal scrollPos', () => {
            expect(service.firstVisibleCol).toBe(SCROLL_POS);
        });

        it('cellX should return visibleCol * cellWidth', () => {
            expect(service.cellX(0)).toBe(0);
            expect(service.cellX(5)).toBe(50);
        });

        it('cellXWithSpan should return visibleCol * cellWidth', () => {
            expect(service.cellXWithSpan(3, 2)).toBe(30);
        });

        it('headerCellX should return logicalCol * cellWidth', () => {
            expect(service.headerCellX(0)).toBe(0);
            expect(service.headerCellX(10)).toBe(100);
        });

        it('headerAlignment should be negative scroll offset', () => {
            expect(service.headerAlignment()).toBe(-SCROLL_POS * CELL_WIDTH);
        });

        it('visibleColFromMouseX should map pixel to visible column', () => {
            expect(service.visibleColFromMouseX(0)).toBe(0);
            expect(service.visibleColFromMouseX(55)).toBe(5);
        });

        it('fillHandleX should return cellX + cellWidth', () => {
            expect(service.fillHandleX(30)).toBe(40);
        });
    });

    describe('RTL', () => {
        beforeEach(() => {
            document.documentElement.dir = 'rtl';
        });

        it('should report isRtl as true', () => {
            expect(service.isRtl).toBe(true);
        });

        it('firstVisibleCol should still equal scrollPos', () => {
            expect(service.firstVisibleCol).toBe(SCROLL_POS);
        });

        it('cellX should place visibleCol 0 at right edge', () => {
            expect(service.cellX(0)).toBe(VIEWPORT_WIDTH - CELL_WIDTH);
        });

        it('cellX should decrease as visibleCol increases', () => {
            expect(service.cellX(0)).toBeGreaterThan(service.cellX(5));
        });

        it('cellXWithSpan should shift left by span columns', () => {
            expect(service.cellXWithSpan(3, 2)).toBe(VIEWPORT_WIDTH - 5 * CELL_WIDTH);
        });

        it('headerCellX should reverse logical column order', () => {
            expect(service.headerCellX(0)).toBe((TOTAL_COLUMNS - 1) * CELL_WIDTH);
            expect(service.headerCellX(TOTAL_COLUMNS - 1)).toBe(0);
        });

        it('headerAlignment should mirror from right', () => {
            const expected = VIEWPORT_WIDTH - (TOTAL_COLUMNS - SCROLL_POS) * CELL_WIDTH;
            expect(service.headerAlignment()).toBe(expected);
        });

        it('visibleColFromMouseX should map from right edge', () => {
            expect(service.visibleColFromMouseX(VIEWPORT_WIDTH)).toBe(0);
            expect(service.visibleColFromMouseX(VIEWPORT_WIDTH - 55)).toBe(5);
        });

        it('fillHandleX should return cellX directly (left edge)', () => {
            expect(service.fillHandleX(30)).toBe(30);
        });
    });

    describe('LTR/RTL symmetry', () => {
        it('cellX span should always equal cellWidth', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                const x = service.cellX(3);
                const xNext = service.cellX(2);
                expect(Math.abs(xNext - x)).toBe(CELL_WIDTH);
            }
        });

        it('cellXWithSpan for span=1 should equal cellX', () => {
            for (const dir of ['ltr', 'rtl']) {
                document.documentElement.dir = dir;
                expect(service.cellXWithSpan(3, 1)).toBe(service.cellX(3));
            }
        });
    });
});
