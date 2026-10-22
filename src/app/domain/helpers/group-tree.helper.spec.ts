// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroup } from 'src/app/domain/models/group/group.interface';
import { flattenGroupTree } from './group-tree.helper';

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
