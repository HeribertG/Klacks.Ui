// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Merged bindings of a table column: lists the fields that can be merged into a column, adds and removes
 * them and resolves their labels from a cache filled while the candidates are listed.
 * @param field - Table column whose merged bindings are edited
 * @param key - Data binding key of a merged field
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { DEFAULT_BINDING_SEPARATOR } from '../report-designer.constants';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerMergeService {
  private state = inject(ReportDesignerStateService);
  private translate = inject(TranslateService);

  private mergeFieldLabelCache = new Map<string, string>();

  getAvailableMergeFields(field: ReportField): { key: string; label: string }[] {
    this.mergeFieldLabelCache.clear();
    const usedBindings = new Set([field.dataBinding, ...(field.additionalBindings ?? [])]);
    const seen = new Set<string>();
    const result: { key: string; label: string }[] = [];

    for (const ds of this.state.activeDataSets) {
      const dsLabel = this.translate.instant(ds.i18nKey);
      for (const f of ds.tableFields) {
        if (seen.has(f.key) || usedBindings.has(f.key) || f.type === ReportFieldType.Image) continue;
        seen.add(f.key);
        const fieldLabel = this.translate.instant(f.i18nKey);
        const fullLabel = `${dsLabel}.${fieldLabel}`;
        this.mergeFieldLabelCache.set(f.key, fullLabel);
        result.push({ key: f.key, label: fullLabel });
      }
    }
    return result;
  }

  addMergedBinding(field: ReportField, key: string): void {
    if (!key) return;
    if (!field.additionalBindings) field.additionalBindings = [];
    if (field.additionalBindings.includes(key)) return;
    field.additionalBindings = [...field.additionalBindings, key];
    if (!field.bindingSeparator) field.bindingSeparator = DEFAULT_BINDING_SEPARATOR;
    this.state.emitChange();
  }

  removeMergedBinding(field: ReportField, key: string): void {
    if (!field.additionalBindings) return;
    field.additionalBindings = field.additionalBindings.filter(b => b !== key);
    if (field.additionalBindings.length === 0) {
      field.additionalBindings = undefined;
      field.bindingSeparator = undefined;
    }
    this.state.emitChange();
  }

  getMergedFieldLabel(key: string): string {
    const cached = this.mergeFieldLabelCache.get(key);
    if (cached) return cached;
    for (const ds of this.state.activeDataSets) {
      const def = ds.tableFields.find(f => f.key === key);
      if (def) {
        const label = `${this.translate.instant(ds.i18nKey)}.${this.translate.instant(def.i18nKey)}`;
        this.mergeFieldLabelCache.set(key, label);
        return label;
      }
    }
    return key;
  }
}
