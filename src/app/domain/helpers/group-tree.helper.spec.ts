// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroup } from 'src/app/domain/models/group/group.interface';
import { flattenGroupTree, groupHierarchyIds } from './group-tree.helper';

const node = (name: string, children?: IGroup[]): IGroup => ({ name, children }) as IGroup;

describe('flattenGroupTree', () => {
  it('lists every group before its descendants, depth first', () => {
    const tree = [node('a', [node('a1', [node('a1x')]), node('a2', [])]), node('b')];

    expect(flattenGroupTree(tree).map((g) => g.name)).toEqual(['a', 'a1', 'a1x', 'a2', 'b']);
  });

  it('returns an empty list for an empty tree', () => {
    expect(flattenGroupTree([])).toEqual([]);
  });
});

describe('groupHierarchyIds', () => {
  const nodes = [
    { id: 'root', name: 'Root' },
    { id: 'a', name: 'A', parent: 'root' },
    { id: 'a-1', name: 'A1', parent: 'a' },
    { id: 'b', name: 'B', parent: 'root' },
  ] as IGroup[];

  it('holds the group and every level of subgroups, and nothing beside them', () => {
    expect(groupHierarchyIds(nodes, 'a')).toEqual(['a', 'a-1']);
    expect(groupHierarchyIds(nodes, 'root')).toEqual(['root', 'a', 'b', 'a-1']);
  });

  it('holds at least the group itself when the list does not know it', () => {
    expect(groupHierarchyIds([], 'a')).toEqual(['a']);
  });
});
