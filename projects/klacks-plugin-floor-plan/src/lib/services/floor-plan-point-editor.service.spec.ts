// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure math functions in FloorPlanPointEditorService.
 */

import { describe, it, expect } from 'vitest';
import {
  nodesToSvgString,
  deleteNode,
  PathNode,
} from './floor-plan-point-editor.service';

describe('nodesToSvgString', () => {
  it('generates M + L + Z for a closed rect-like path', () => {
    const nodes: PathNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'L', x: 100, y: 0 },
      { command: 'L', x: 100, y: 50 },
      { command: 'L', x: 0, y: 50 },
    ];
    const result = nodesToSvgString(nodes, true);
    expect(result).toContain('M 0 0');
    expect(result).toContain('L 100 0');
    expect(result).toContain('L 100 50');
    expect(result).toContain('L 0 50');
    expect(result.endsWith('Z')).toBe(true);
  });

  it('generates C command with all 6 control values', () => {
    const nodes: PathNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'C', cp1: { x: 10, y: -5 }, cp2: { x: 90, y: -5 }, x: 100, y: 0 },
    ];
    const result = nodesToSvgString(nodes, false);
    expect(result).toContain('C 10 -5 90 -5 100 0');
  });

  it('generates Q command with 4 values', () => {
    const nodes: PathNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'Q', cp1: { x: 50, y: -30 }, x: 100, y: 0 },
    ];
    const result = nodesToSvgString(nodes, false);
    expect(result).toContain('Q 50 -30 100 0');
  });

  it('omits Z when isClosed is false', () => {
    const nodes: PathNode[] = [
      { command: 'M', x: 0, y: 0 },
      { command: 'L', x: 100, y: 0 },
    ];
    expect(nodesToSvgString(nodes, false)).not.toContain('Z');
  });
});

describe('deleteNode', () => {
  const make = (n: number): PathNode[] =>
    Array.from({ length: n }, (_, i) => ({ command: i === 0 ? 'M' : 'L' as const, x: i * 10, y: 0 }));

  it('removes the node at the given index', () => {
    const nodes = make(4); // M L L L
    const result = deleteNode(nodes, 2);
    expect(result).toHaveLength(3);
    expect(result[2].x).toBe(30);
  });

  it('promotes second node to M when deleting index 0', () => {
    const nodes = make(4);
    const result = deleteNode(nodes, 0);
    expect(result[0].command).toBe('M');
    expect(result[0].x).toBe(10);
  });

  it('refuses to delete below 2 nodes', () => {
    const nodes = make(2);
    const result = deleteNode(nodes, 1);
    expect(result).toHaveLength(2); // unchanged
  });

  it('refuses to delete below 2 nodes from 1-node input', () => {
    const nodes = make(1);
    const result = deleteNode(nodes, 0);
    expect(result).toHaveLength(1);
  });
});
