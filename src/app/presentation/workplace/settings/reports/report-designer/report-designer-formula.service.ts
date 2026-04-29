// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for formula editor state management, formula testing, variable definitions, and manual loading.
 * @param formulaService - FormulaEvaluationService for validation and evaluation
 * @param sourceId - The active report source ID used for variable resolution
 * @param dataSetIds - The active data set IDs used for variable resolution
 */

import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { getFormulaVariables, getFooterFormulaVariables, FormulaVariableDefinition } from 'src/app/domain/models/report/formula-variables.model';
import { createFormulaTestData, createFooterFormulaTestData } from 'src/app/domain/models/report/formula-test-data';
import { PropertyMetadata } from 'src/app/domain/models/shift/shift-data-class';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

export type FormulaEditorTab = 'formula' | 'variables' | 'explanations';

@Injectable()
export class ReportDesignerFormulaService {
  private formulaService = inject(FormulaEvaluationService);
  private manualLoader = inject(ManualLoaderService);
  private translate = inject(TranslateService);

  showFormulaEditor = false;
  formulaEditorField: ReportField | null = null;
  formulaTestResult = '';
  formulaTestData: Record<string, unknown> = {};
  formulaTestMetadata?: PropertyMetadata;

  formulaTabId = signal<FormulaEditorTab>('formula');
  manualContent = signal<string>('');
  private manualLoaded = false;

  getFormulaStatus(field: ReportField): 'empty' | 'valid' | 'error' {
    if (!field.formula) return 'empty';
    const result = this.formulaService.validateFormula(field.formula);
    return result.valid ? 'valid' : 'error';
  }

  onFormulaChange(field: ReportField, formula: string): void {
    field.formula = formula;
    this.formulaService.clearCache();
  }

  onFormulaNameChange(field: ReportField, name: string): void {
    field.name = name;
  }

  getFormulaVariableDefs(sourceId: string, dataSetIds: string[]): FormulaVariableDefinition[] {
    return getFormulaVariables(sourceId, dataSetIds);
  }

  getFooterFormulaVariableDefs(sourceId: string, dataSetIds: string[]): FormulaVariableDefinition[] {
    return getFooterFormulaVariables(sourceId, dataSetIds);
  }

  testFormula(field: ReportField): string {
    if (!field.formula) return '';
    return this.formulaService.evaluateFormula(field.formula, { ...this.formulaTestData });
  }

  openFormulaEditor(field: ReportField, bodySections: ReportSection[], sourceId: string, dataSetIds: string[]): void {
    this.formulaEditorField = field;
    this.showFormulaEditor = true;
    this.formulaTestResult = '';
    this.formulaTabId.set('formula');
    const isFooter = bodySections.some(s => s.tableFooterFields?.includes(field));
    const testObj = isFooter
      ? createFooterFormulaTestData(sourceId)
      : createFormulaTestData(sourceId, dataSetIds);
    this.formulaTestData = testObj;
    this.formulaTestMetadata = (testObj.constructor as { metadata?: PropertyMetadata }).metadata;
  }

  closeFormulaEditor(): void {
    this.showFormulaEditor = false;
    this.formulaEditorField = null;
    this.formulaTestResult = '';
  }

  setTab(tab: FormulaEditorTab): void {
    this.formulaTabId.set(tab);
    if (tab === 'explanations' && !this.manualLoaded) {
      this.loadManual();
    }
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('formula-manual', lang).subscribe(content => {
      this.manualContent.set(content);
      this.manualLoaded = true;
    });
  }

  runFormulaTest(): void {
    if (this.formulaEditorField) {
      this.formulaTestResult = this.testFormula(this.formulaEditorField);
    }
  }
}
