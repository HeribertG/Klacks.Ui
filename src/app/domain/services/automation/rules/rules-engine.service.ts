// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { MacroManagementService } from '../../../services/settings/macro-management.service';
import { MacroRuleTemplatesService } from './macro-rule-templates.service';
import { MacroRulesEvaluatorService } from './macro-rules-evaluator.service';
import { IScheduleContext, IRuleViolation } from '../../../models/automation/rules/rule.model';
import { IMacro } from '../../../models/settings/macro-class';

export const SCHEDULING_RULE_MACRO_TYPE = 100;

@Injectable({
  providedIn: 'root'
})
export class RulesEngineService {
  private macroManagementService = inject(MacroManagementService);
  private templatesService = inject(MacroRuleTemplatesService);
  private evaluator = inject(MacroRulesEvaluatorService);

  private isInitialized = false;

  initialize(macroType: number = SCHEDULING_RULE_MACRO_TYPE): void {
    if (this.isInitialized) {
      return;
    }

    if (this.macroManagementService.macroList().length === 0) {
      this.macroManagementService.loadMacros();
    }

    this.evaluator.loadMacros(
      this.macroManagementService.macroList(),
      macroType
    );

    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  reload(macroType: number = SCHEDULING_RULE_MACRO_TYPE): void {
    this.evaluator.loadMacros(
      this.macroManagementService.macroList(),
      macroType
    );
  }

  evaluate(context: IScheduleContext): {
    violations: IRuleViolation[];
    maxSeverity: number;
    allPassed: boolean;
  } {
    this.ensureInitialized();

    const { summary, violations } = this.evaluator.evaluateAll(context);

    return {
      violations,
      maxSeverity: summary.maxSeverity,
      allPassed: summary.allPassed
    };
  }

  hasViolations(context: IScheduleContext): boolean {
    this.ensureInitialized();
    return this.evaluator.hasViolations(context);
  }

  getViolations(context: IScheduleContext): IRuleViolation[] {
    this.ensureInitialized();
    return this.evaluator.getViolations(context);
  }

  getRuleTemplates() {
    return this.templatesService.getTemplates();
  }

  createMacroFromTemplate(templateId: string): Partial<IMacro> | null {
    const template = this.templatesService.getTemplateById(templateId);
    if (!template) {
      return null;
    }

    return this.templatesService.createMacroFromTemplate(
      template,
      SCHEDULING_RULE_MACRO_TYPE
    );
  }

  importDefaultRules(): Partial<IMacro>[] {
    const templates = this.templatesService.getTemplates();
    return templates.map(t =>
      this.templatesService.createMacroFromTemplate(t, SCHEDULING_RULE_MACRO_TYPE)
    );
  }

  getActiveRuleCount(): number {
    return this.evaluator.getActiveMacroIds().length;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initialize();
    }
  }
}
