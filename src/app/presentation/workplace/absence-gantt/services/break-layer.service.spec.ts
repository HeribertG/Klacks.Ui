/* eslint-disable @typescript-eslint/no-explicit-any */
import { BreakLayerService } from './break-layer.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';

function createBreak(
    id: string,
    from: Date,
    until: Date,
    absenceId = 'abs-1',
    clientId = 'client-1'
): IBreakPlaceholder {
    return { id, from, until, absenceId, clientId } as any;
}

describe('BreakLayerService', () => {
    let service: BreakLayerService;

    beforeEach(() => {
        service = new BreakLayerService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('calculateBreakLayers', () => {
        it('should return empty array for null input', () => {
            expect(service.calculateBreakLayers(null as any)).toEqual([]);
        });

        it('should return empty array for empty input', () => {
            expect(service.calculateBreakLayers([])).toEqual([]);
        });

        it('should assign layer 0 to single break', () => {
            const breaks = [createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5))];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(1);
            expect(result[0].layer).toBe(0);
        });

        it('should assign layer 0 to non-overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 15)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(2);
            expect(result[0].layer).toBe(0);
            expect(result[1].layer).toBe(0);
        });

        it('should assign equal overlap count to overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 15)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(2);
            expect(result[0].layer).toBe(1);
            expect(result[1].layer).toBe(1);
        });

        it('should handle 3 mutually overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 20)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 25)),
                createBreak('3', new Date(2024, 0, 10), new Date(2024, 0, 30)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(3);
            expect(result[0].layer).toBe(2);
            expect(result[1].layer).toBe(2);
            expect(result[2].layer).toBe(2);
        });

        it('should filter out breaks with null from/until', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                { id: '2', from: null, until: new Date(2024, 0, 10) } as any,
                { id: '3', from: new Date(2024, 0, 1), until: null } as any,
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should filter out breaks where from > until', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 10), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 1), new Date(2024, 0, 3)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('2');
        });

        it('should sort breaks by start date', () => {
            const breaks = [
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 15)),
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('2');
        });
    });

    describe('calculateOptimizedBreakLayers', () => {
        it('should return empty array for null input', () => {
            expect(service.calculateOptimizedBreakLayers(null as any)).toEqual([]);
        });

        it('should return empty array for empty input', () => {
            expect(service.calculateOptimizedBreakLayers([])).toEqual([]);
        });

        it('should assign layer 0 to single break', () => {
            const breaks = [createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5))];

            const result = service.calculateOptimizedBreakLayers(breaks);

            expect(result).toHaveLength(1);
            expect(result[0].layer).toBe(0);
        });

        it('should assign layer 0 to non-overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 15)),
            ];

            const result = service.calculateOptimizedBreakLayers(breaks);

            result.forEach(b => expect(b.layer).toBe(0));
        });

        it('should use minimal layers for overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 15)),
            ];

            const result = service.calculateOptimizedBreakLayers(breaks);

            expect(result[0].layer).toBe(0);
            expect(result[1].layer).toBe(1);
        });

        it('should reuse layer 0 when slot becomes available', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 3), new Date(2024, 0, 8)),
                createBreak('3', new Date(2024, 0, 7), new Date(2024, 0, 12)),
            ];

            const result = service.calculateOptimizedBreakLayers(breaks);

            expect(result[0].layer).toBe(0);
            expect(result[1].layer).toBe(1);
            expect(result[2].layer).toBe(0);
        });

        it('should handle 3 simultaneously overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 30)),
                createBreak('2', new Date(2024, 0, 1), new Date(2024, 0, 30)),
                createBreak('3', new Date(2024, 0, 1), new Date(2024, 0, 30)),
            ];

            const result = service.calculateOptimizedBreakLayers(breaks);

            const layers = new Set(result.map(r => r.layer));
            expect(layers.size).toBe(3);
            expect(layers).toContain(0);
            expect(layers).toContain(1);
            expect(layers).toContain(2);
        });

        it('should filter invalid breaks before calculating', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                { id: '2', from: null, until: null } as any,
            ];

            const result = service.calculateOptimizedBreakLayers(breaks);

            expect(result).toHaveLength(1);
        });
    });

    describe('getMaxSimultaneousOverlaps', () => {
        it('should return 0 for null input', () => {
            expect(service.getMaxSimultaneousOverlaps(null as any)).toBe(0);
        });

        it('should return 0 for empty input', () => {
            expect(service.getMaxSimultaneousOverlaps([])).toBe(0);
        });

        it('should return 1 for single break', () => {
            const breaks = [createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5))];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(1);
        });

        it('should return 1 for non-overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 15)),
            ];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(1);
        });

        it('should return 2 for 2 overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 15)),
            ];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(2);
        });

        it('should return 3 for 3 simultaneously overlapping breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 20)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 25)),
                createBreak('3', new Date(2024, 0, 10), new Date(2024, 0, 30)),
            ];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(3);
        });

        it('should handle adjacent breaks (end == start) as overlap', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 10)),
            ];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(1);
        });

        it('should filter invalid breaks', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10)),
                { id: '2', from: null, until: null } as any,
            ];

            expect(service.getMaxSimultaneousOverlaps(breaks)).toBe(1);
        });
    });

    describe('getOverlapCount', () => {
        it('should return 0 for break with no overlaps', () => {
            const target = createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5));
            const all = [
                target,
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 15)),
            ];

            expect(service.getOverlapCount(target, all)).toBe(0);
        });

        it('should return 1 for break with 1 overlap', () => {
            const target = createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10));
            const all = [
                target,
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 15)),
            ];

            expect(service.getOverlapCount(target, all)).toBe(1);
        });

        it('should return 2 for break with 2 overlaps', () => {
            const target = createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 20));
            const all = [
                target,
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 15)),
                createBreak('3', new Date(2024, 0, 10), new Date(2024, 0, 25)),
            ];

            expect(service.getOverlapCount(target, all)).toBe(2);
        });

        it('should not count the target break itself', () => {
            const target = createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10));
            const all = [target];

            expect(service.getOverlapCount(target, all)).toBe(0);
        });
    });

    describe('calculateRecommendedRowHeight', () => {
        it('should return baseCellHeight for no breaks', () => {
            expect(service.calculateRecommendedRowHeight([], 45)).toBe(45);
        });

        it('should return baseCellHeight for null breaks', () => {
            expect(service.calculateRecommendedRowHeight(null as any, 45)).toBe(45);
        });

        it('should return baseCellHeight for single break', () => {
            const breaks = [createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5))];

            expect(service.calculateRecommendedRowHeight(breaks, 45)).toBe(45 + 1 * (45 / 4));
        });

        it('should increase height with more overlaps', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 20)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 25)),
            ];

            const result = service.calculateRecommendedRowHeight(breaks, 40);

            expect(result).toBe(40 + 2 * 10);
        });

        it('should use custom layerHeight when provided', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 20)),
                createBreak('2', new Date(2024, 0, 5), new Date(2024, 0, 25)),
            ];

            const result = service.calculateRecommendedRowHeight(breaks, 40, 20);

            expect(result).toBe(40 + 2 * 20);
        });
    });

    describe('edge cases', () => {
        it('should handle identical breaks (same dates)', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 10)),
                createBreak('2', new Date(2024, 0, 1), new Date(2024, 0, 10)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(2);
            expect(result[0].layer).toBe(1);
            expect(result[1].layer).toBe(1);
        });

        it('should handle break completely contained within another', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 30)),
                createBreak('2', new Date(2024, 0, 10), new Date(2024, 0, 20)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(2);
            result.forEach(b => expect(b.layer).toBe(1));
        });

        it('should handle null entries in breaks array', () => {
            const breaks = [
                null as any,
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(1);
        });

        it('should handle same-day breaks (from == until)', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 5), new Date(2024, 0, 5)),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(1);
            expect(result[0].layer).toBe(0);
        });

        it('should preserve break properties in result', () => {
            const breaks = [
                createBreak('1', new Date(2024, 0, 1), new Date(2024, 0, 5), 'abs-1', 'client-1'),
            ];

            const result = service.calculateBreakLayers(breaks);

            expect(result[0].id).toBe('1');
            expect(result[0].absenceId).toBe('abs-1');
            expect(result[0].clientId).toBe('client-1');
            expect(result[0].layer).toBeDefined();
        });

        it('should handle large number of non-overlapping breaks', () => {
            const breaks: IBreakPlaceholder[] = [];
            for (let i = 0; i < 100; i++) {
                breaks.push(
                    createBreak(
                        `${i}`,
                        new Date(2024, 0, i * 3 + 1),
                        new Date(2024, 0, i * 3 + 2)
                    )
                );
            }

            const result = service.calculateBreakLayers(breaks);

            expect(result).toHaveLength(100);
            result.forEach(b => expect(b.layer).toBe(0));
        });
    });
});
