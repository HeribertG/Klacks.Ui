// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure value helpers shared by the report data providers: row selection, availability hours and group tree lookups.
 * @param selection - Checked rows of a list screen, applied like the excel export
 * @param ranges - Comma separated availability ranges such as "08:00-12:00,14:00-18:00"
 * @param nodes - Group tree nodes searched for a group id
 */

import { timeToMinutes } from 'src/app/domain/helpers/time-format.helper';
import { IClientExportSelection } from 'src/app/domain/models/client/i-client-export-selection';
import { IClient } from 'src/app/domain/models/client/client-class';
import { IGroup } from 'src/app/domain/models/group/group.interface';

const GROUP_PATH_SEPARATOR = ' > ';
const MINUTES_PER_HOUR = 60;

export function applyClientSelection<T extends { id?: string }>(rows: T[], selection?: IClientExportSelection): T[] {
  if (!selection || selection.selection.length === 0) {
    return rows;
  }
  const isSelected = (row: T): boolean => selection.selection.some(id => id === row.id);
  if (!selection.selectAll && !selection.invertedSelection) {
    return rows.filter(isSelected);
  }
  if (selection.invertedSelection) {
    return rows.filter(r => !isSelected(r));
  }
  return rows;
}

export function computeHoursFromRanges(ranges: string): number {
  if (!ranges) return 0;
  return ranges.split(',').reduce((sum, part) => {
    const [start, end] = part.split('-');
    if (!start || !end) return sum;
    const minutes = timeToMinutes(end) - timeToMinutes(start);
    return minutes > 0 ? sum + minutes / MINUTES_PER_HOUR : sum;
  }, 0);
}

export function findGroupInTree(nodes: IGroup[], id: string | undefined): IGroup | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findGroupInTree(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

export function buildGroupPath(path: IGroup[], group: IGroup | undefined): string {
  const names = path.map(p => p.name).filter(Boolean);
  if (names.length === 0) {
    return group?.name ?? '';
  }
  return names.join(GROUP_PATH_SEPARATOR);
}

export function buildSubGroupsSummary(treeNode: IGroup | undefined): string {
  return (treeNode?.children ?? [])
    .filter(child => !!child.name)
    .map(child => `${child.name} (${child.clientsCount ?? 0})`)
    .join('\n');
}

export function buildNotesSummary(client: IClient | undefined): string {
  const notes = (client?.annotations ?? [])
    .map(a => a.note?.trim())
    .filter((n): n is string => !!n);
  return notes.join('\n');
}
