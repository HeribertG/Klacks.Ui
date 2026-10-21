// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure helpers of the report designer palette: grouping data sets that share the same table columns
 * and removing duplicate field definitions.
 * @param dataSets - Active data sets of the report source
 * @param fields - Field definitions that may contain the same key more than once
 */

import { DataBindingDefinition } from 'src/app/domain/models/report/data-binding-definition.interface';
import { ReportDataSet } from 'src/app/domain/models/report/report-data-set.interface';

export function groupDataSetsByFields(dataSets: ReportDataSet[]): { dataSets: ReportDataSet[] }[] {
  const groups: { signature: string; dataSets: ReportDataSet[] }[] = [];
  for (const ds of dataSets) {
    const sig = ds.tableFields.map(f => f.key).join(',');
    const existing = groups.find(g => g.signature === sig);
    if (existing) {
      existing.dataSets.push(ds);
    } else {
      groups.push({ signature: sig, dataSets: [ds] });
    }
  }
  return groups;
}

export function deduplicateFields(fields: DataBindingDefinition[]): DataBindingDefinition[] {
  const map = new Map<string, DataBindingDefinition>();
  for (const f of fields) {
    if (!map.has(f.key)) map.set(f.key, f);
  }
  return Array.from(map.values());
}
