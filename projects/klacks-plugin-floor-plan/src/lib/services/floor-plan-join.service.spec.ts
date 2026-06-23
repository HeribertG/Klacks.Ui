// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure math functions in FloorPlanJoinService.
 */

import { describe, it, expect } from 'vitest';
import type { FabricObject } from 'fabric';
import {
  dist,
  reverseNodes,
  buildGreedyChain,
  buildJoinedSvg,
} from './floor-plan-join.service';

interface JNode { x: number; y: number; command: 'M' | 'L' | 'C' | 'Q'; cp1?: {x:number;y:number}; cp2?: {x:number;y:number} }
interface JItem { obj: FabricObject; nodes: JNode[]; isClosed: boolean }

const fakeFabricObject = {} as FabricObject;

describe('dist', () => {
  it('returns euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
  it('returns 0 for identical points', () => {
    expect(dist({ x: 7, y: 3 }, { x: 7, y: 3 })).toBe(0);
  });
});

describe('reverseNodes', () => {
  it('reverses a two-node M+L sequence', () => {
    const nodes: JNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'L', x: 100, y: 0 },
    ];
    const rev = reverseNodes(nodes);
    expect(rev[0]).toEqual({ command: 'M', x: 100, y: 0 });
    expect(rev[1]).toEqual({ command: 'L', x: 0, y: 0 });
  });

  it('swaps cp1 and cp2 for a cubic bezier when reversed', () => {
    const nodes: JNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'C', cp1: { x: 10, y: 5 }, cp2: { x: 90, y: 5 }, x: 100, y: 0 },
    ];
    const rev = reverseNodes(nodes);
    expect(rev[0]).toEqual({ command: 'M', x: 100, y: 0 });
    expect(rev[1].command).toBe('C');
    expect(rev[1].cp1).toEqual({ x: 90, y: 5 });
    expect(rev[1].cp2).toEqual({ x: 10, y: 5 });
    expect(rev[1].x).toBe(0);
    expect(rev[1].y).toBe(0);
  });

  it('preserves Q control point when reversed', () => {
    const nodes: JNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'Q', cp1: { x: 50, y: -30 }, x: 100, y: 0 },
    ];
    const rev = reverseNodes(nodes);
    expect(rev[0]).toEqual({ command: 'M', x: 100, y: 0 });
    expect(rev[1].command).toBe('Q');
    expect(rev[1].cp1).toEqual({ x: 50, y: -30 });
    expect(rev[1].x).toBe(0);
    expect(rev[1].y).toBe(0);
  });
});

describe('buildGreedyChain', () => {
  const makeItem = (nodes: JNode[]): JItem => ({ obj: fakeFabricObject, nodes, isClosed: false });

  it('keeps two items in order when end of first matches start of second', () => {
    const a = makeItem([{ command: 'M', x: 0, y: 0 }, { command: 'L', x: 100, y: 0 }]);
    const b = makeItem([{ command: 'M', x: 100, y: 0 }, { command: 'L', x: 200, y: 0 }]);
    const chain = buildGreedyChain([a, b]);
    expect(chain[0].nodes[0]).toEqual({ command: 'M', x: 0, y: 0 });
    expect(chain[1].nodes[chain[1].nodes.length - 1]).toEqual({ command: 'L', x: 200, y: 0 });
  });

  it('reverses second path when its end is nearer to chain end than its start', () => {
    const a = makeItem([{ command: 'M', x: 0, y: 0 }, { command: 'L', x: 100, y: 0 }]);
    const b = makeItem([{ command: 'M', x: 200, y: 0 }, { command: 'L', x: 100, y: 0 }]);
    const chain = buildGreedyChain([a, b]);
    expect(chain[1].nodes[0]).toEqual({ command: 'M', x: 100, y: 0 });
    expect(chain[1].nodes[chain[1].nodes.length - 1].x).toBeCloseTo(200);
  });

  it('chains three items in nearest-endpoint order', () => {
    const a = makeItem([{ command: 'M', x: 0, y: 0 }, { command: 'L', x: 10, y: 0 }]);
    const b = makeItem([{ command: 'M', x: 10, y: 0 }, { command: 'L', x: 20, y: 0 }]);
    const c = makeItem([{ command: 'M', x: 20, y: 0 }, { command: 'L', x: 30, y: 0 }]);
    const chain = buildGreedyChain([a, c, b]);
    expect(chain[0].nodes[0].x).toBeCloseTo(0);
    expect(chain[2].nodes[chain[2].nodes.length - 1].x).toBeCloseTo(30);
  });
});

describe('buildJoinedSvg', () => {
  it('produces M...L...Z for two L-only items', () => {
    const items: JItem[] = [
      { obj: fakeFabricObject, nodes: [{ command: 'M', x: 0, y: 0 }, { command: 'L', x: 100, y: 0 }], isClosed: false },
      { obj: fakeFabricObject, nodes: [{ command: 'M', x: 100, y: 0 }, { command: 'L', x: 100, y: 50 }], isClosed: false },
    ];
    const svg = buildJoinedSvg(items as unknown as Parameters<typeof buildJoinedSvg>[0]);
    expect(svg).toContain('M 0 0');
    expect(svg).toContain('L 100 0');
    expect(svg).toContain('L 100 50');
    expect(svg.endsWith('Z')).toBe(true);
  });
});
