// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { DrawHelper } from './draw-helper';
import {
    TextAlignmentEnum,
    BaselineAlignmentEnum,
} from '../shared/grid/enums/cell-settings.enum';

describe('DrawHelper', () => {
    let canvas: HTMLCanvasElement;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let ctx;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
    });

    describe('GetDarkColor', () => {
        it('should return a darker color', () => {
            const originalColor = '#FFFFFF';
            const darkenedColor = DrawHelper.GetDarkColor(originalColor, 10);

            expect(darkenedColor).not.toEqual(originalColor);
        });
    });

    describe('GetLightColor', () => {
        it('should return a lighter color', () => {
            const originalColor = '#454545';
            const lighteredColor = DrawHelper.GetLightColor(originalColor, 10);

            expect(lighteredColor).not.toEqual(originalColor);
        });
    });

    it('should throw an error if color or d is not provided', () => {
        expect(() => DrawHelper.GetDarkColor('', 10)).toThrowError('color component is invalid.');
    });

    it('should throw an error if color or d is not provided', () => {
        expect(() => DrawHelper.GetDarkColor('', 10)).toThrowError('color component is invalid.');
    });

    // describe('createHiDPICanvas', () => {
    //   it('should create and return a canvas rendering context', () => {
    //     const context = DrawHelper.createHiDPICanvas(canvas, 100, 100);

    //     expect(context).toBeDefined();
    //     expect(canvas.width).toBe(100);
    //     expect(canvas.height).toBe(100);
    //   });
    // });

    describe('drawText', () => {
        interface FakeMetrics {
            width: number;
            fontBoundingBoxAscent?: number;
            fontBoundingBoxDescent?: number;
        }

        interface FakeCtx {
            calls: string[];
            rectArgs: number[] | undefined;
            fillTextArgs: [string, number, number] | undefined;
            measureTextResult: FakeMetrics;
            textBaseline?: string;
            canvas?: { height: number };
            save(): void;
            restore(): void;
            beginPath(): void;
            rect(x: number, y: number, w: number, h: number): void;
            clip(): void;
            measureText(text: string): FakeMetrics;
            fillText(text: string, x: number, y: number): void;
            getTransform?(): { d: number };
        }

        function createFakeCtx(
            measureTextResult: FakeMetrics,
            canvasOptions?: { height: number; verticalScale: number }
        ): FakeCtx {
            const fakeCtx: FakeCtx = {
                calls: [],
                rectArgs: undefined,
                fillTextArgs: undefined,
                measureTextResult,
                canvas: canvasOptions ? { height: canvasOptions.height } : undefined,
                save() {
                    this.calls.push('save');
                },
                restore() {
                    this.calls.push('restore');
                },
                beginPath() {
                    this.calls.push('beginPath');
                },
                rect(x, y, w, h) {
                    this.calls.push('rect');
                    this.rectArgs = [x, y, w, h];
                },
                clip() {
                    this.calls.push('clip');
                },
                measureText() {
                    this.calls.push('measureText');
                    return this.measureTextResult;
                },
                fillText(text, x, y) {
                    this.calls.push('fillText');
                    this.fillTextArgs = [text, x, y];
                },
                getTransform: canvasOptions
                    ? () => ({ d: canvasOptions.verticalScale })
                    : undefined,
            };

            return fakeCtx;
        }

        const originalDir = document.documentElement.dir;

        afterEach(() => {
            document.documentElement.dir = originalDir;
        });

        it('sets textBaseline to alphabetic', () => {
            const fakeCtx = createFakeCtx({ width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            expect(fakeCtx.textBaseline).toBe('alphabetic');
        });

        it('computes the center baseline y from ascent and descent', () => {
            const fakeCtx = createFakeCtx({ width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            expect(fakeCtx.fillTextArgs?.[2]).toBe(16);
        });

        it('keeps the clip rect vertically covering the full font box', () => {
            const fakeCtx = createFakeCtx({ width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            const [rx, ry, rw, rh] = fakeCtx.rectArgs as number[];
            expect(rx).toBe(3);
            expect(rw).toBe(55);
            expect(ry).toBeLessThanOrEqual(0);
            expect(ry + rh).toBeGreaterThanOrEqual(20);
        });

        it('does not clip descenders when the row slot is shrunk (baselineReducer) but the cell canvas has room', () => {
            // Real GridFontsService values: 11pt main text, baselineReducer 0.8 -> h=15.64,
            // Segoe UI ascent/descent 16/4 (ascent+descent=20 > h). cellHeight=50 logical (dpr 2 -> 100 physical).
            const fakeCtx = createFakeCtx(
                { width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 },
                { height: 100, verticalScale: 2 }
            );

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'Zweiter Bug',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            const baselineY = fakeCtx.fillTextArgs?.[2] as number;
            const [, ry, , rh] = fakeCtx.rectArgs as number[];
            expect(ry + rh).toBeGreaterThanOrEqual(baselineY + 4);
        });

        it('caps the clip at the real canvas bottom when the font box does not fit even with slack', () => {
            const fakeCtx = createFakeCtx(
                { width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 10 },
                { height: 50, verticalScale: 1 }
            );

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'Zweiter Bug',
                0,
                40,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            const [, ry, , rh] = fakeCtx.rectArgs as number[];
            expect(ry + rh).toBe(49);
        });

        it('keeps clip within the slot when the font box is smaller than the slot', () => {
            const fakeCtx = createFakeCtx({ width: 40, fontBoundingBoxAscent: 8, fontBoundingBoxDescent: 2 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                30,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            const [, ry, , rh] = fakeCtx.rectArgs as number[];
            expect(ry).toBe(3);
            expect(ry + rh).toBe(31);
        });

        it('falls back to fontSize based metrics when fontBoundingBox metrics are unavailable', () => {
            const fakeCtx = createFakeCtx({ width: 40 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            expect(Number.isNaN(fakeCtx.fillTextArgs?.[2])).toBe(false);
            expect(Number.isNaN(fakeCtx.rectArgs?.[1])).toBe(false);
            expect(Number.isNaN(fakeCtx.rectArgs?.[3])).toBe(false);
        });

        it('calls beginPath before rect', () => {
            const fakeCtx = createFakeCtx({ width: 40, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });

            DrawHelper.drawText(
                fakeCtx as unknown as CanvasRenderingContext2D,
                'F 08:00',
                0,
                2,
                60,
                15.64,
                '11pt Segoe UI',
                11,
                '#000000',
                TextAlignmentEnum.Center,
                BaselineAlignmentEnum.Center
            );

            const beginPathIndex = fakeCtx.calls.indexOf('beginPath');
            const rectIndex = fakeCtx.calls.indexOf('rect');
            expect(beginPathIndex).toBeGreaterThanOrEqual(0);
            expect(rectIndex).toBeGreaterThan(beginPathIndex);
        });

        it('keeps horizontal x positions unchanged for Center, Left and Right', () => {
            const width = 40;
            const x = 10;
            const w = 60;

            const centerCtx = createFakeCtx({ width, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });
            DrawHelper.drawText(
                centerCtx as unknown as CanvasRenderingContext2D,
                'F 08:00', x, 2, w, 15.64, '11pt Segoe UI', 11, '#000000',
                TextAlignmentEnum.Center, BaselineAlignmentEnum.Center
            );
            expect(centerCtx.fillTextArgs?.[1]).toBe(Math.round((w - width) / 2 + x));

            const leftCtx = createFakeCtx({ width, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });
            DrawHelper.drawText(
                leftCtx as unknown as CanvasRenderingContext2D,
                'F 08:00', x, 2, w, 15.64, '11pt Segoe UI', 11, '#000000',
                TextAlignmentEnum.Left, BaselineAlignmentEnum.Center
            );
            expect(leftCtx.fillTextArgs?.[1]).toBe(Math.round(3 + x));

            const rightCtx = createFakeCtx({ width, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });
            DrawHelper.drawText(
                rightCtx as unknown as CanvasRenderingContext2D,
                'F 08:00', x, 2, w, 15.64, '11pt Segoe UI', 11, '#000000',
                TextAlignmentEnum.Right, BaselineAlignmentEnum.Center
            );
            expect(rightCtx.fillTextArgs?.[1]).toBe(Math.round(w - width - 2 + x));
        });

        it('swaps Left and Right alignment in RTL mode', () => {
            document.documentElement.dir = 'rtl';
            const width = 40;
            const x = 10;
            const w = 60;

            const leftCtx = createFakeCtx({ width, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });
            DrawHelper.drawText(
                leftCtx as unknown as CanvasRenderingContext2D,
                'F 08:00', x, 2, w, 15.64, '11pt Segoe UI', 11, '#000000',
                TextAlignmentEnum.Left, BaselineAlignmentEnum.Center
            );
            expect(leftCtx.fillTextArgs?.[1]).toBe(Math.round(w - width - 2 + x));

            const rightCtx = createFakeCtx({ width, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 });
            DrawHelper.drawText(
                rightCtx as unknown as CanvasRenderingContext2D,
                'F 08:00', x, 2, w, 15.64, '11pt Segoe UI', 11, '#000000',
                TextAlignmentEnum.Right, BaselineAlignmentEnum.Center
            );
            expect(rightCtx.fillTextArgs?.[1]).toBe(Math.round(3 + x));

            document.documentElement.dir = originalDir;
        });
    });
});
