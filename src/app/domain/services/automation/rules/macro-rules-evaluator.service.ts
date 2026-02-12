import { Injectable, inject, signal } from '@angular/core';
import {
  SCRIPT_COMPILER,
  ICompiledScript,
  IScriptCompiler
} from '../../../models/automation/rules/script-compiler.interface';
import { MacroManagementService } from '../../../services/settings/macro-management.service';
import { AppSettingsManagementService } from '../../../services/settings/app-settings-management.service';
import { IMacro } from '../../../models/settings/macro-class';
import {
  IRuleViolation,
  IScheduleContext
} from '../../../models/automation/rules/rule.model';

export interface IRuleEvaluationSummary {
  totalRules: number;
  passed: number;
  warnings: number;
  violations: number;
  maxSeverity: number;
  allPassed: boolean;
}

export interface IMacroRuleResult {
  macroId: string;
  macroName: string;
  passed: boolean;
  severity: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MacroRulesEvaluatorService {
  private scriptCompiler = inject(SCRIPT_COMPILER);
  private macroManagementService = inject(MacroManagementService);
  private appSettings = inject(AppSettingsManagementService);

  private compiledMacros = new Map<string, ICompiledScript>();
  private activeMacroIds = signal<string[]>([]);

  initialize(macroType?: number): void {
    const macros = this.macroManagementService.macroList();
    this.loadMacros(macros, macroType);
  }

  loadMacros(macros: IMacro[], macroType?: number): void {
    this.compiledMacros.clear();
    const activeIds: string[] = [];

    for (const macro of macros) {
      if (macroType !== undefined && macro.type !== macroType) {
        continue;
      }

      if (!macro.content || macro.isDirty === 3) {
        continue;
      }

      const compiled = this.scriptCompiler.compile(macro.content, true, true);

      if (compiled.hasError) {
        console.error(`Failed to compile macro ${macro.id}:`, compiled.error);
        continue;
      }

      if (macro.id) {
        this.compiledMacros.set(macro.id, compiled);
        activeIds.push(macro.id);
      }
    }

    this.activeMacroIds.set(activeIds);
  }

  evaluateAll(context: IScheduleContext): {
    results: IMacroRuleResult[];
    violations: IRuleViolation[];
    summary: IRuleEvaluationSummary;
  } {
    const results: IMacroRuleResult[] = [];
    const violations: IRuleViolation[] = [];

    for (const macroId of this.activeMacroIds()) {
      const result = this.evaluateRule(macroId, context);
      results.push(result);

      if (!result.passed && result.severity > 0) {
        const macro = this.findMacroById(macroId);
        violations.push({
          ruleId: macroId,
          ruleName: macro?.name || macroId,
          ruleType: 'custom' as any,
          severity: result.severity,
          description: result.message
        });
      }
    }

    const summary = this.calculateSummary(results);

    return { results, violations, summary };
  }

  evaluateRule(macroId: string, context: IScheduleContext): IMacroRuleResult {
    const compiled = this.compiledMacros.get(macroId);
    const macro = this.findMacroById(macroId);

    if (!compiled) {
      return {
        macroId,
        macroName: macro?.name || macroId,
        passed: false,
        severity: 0,
        message: 'Macro not compiled or not found'
      };
    }

    const externalVars = this.prepareExternalVariables(context, macro);
    const scriptResult = this.scriptCompiler.execute(compiled, externalVars);

    if (!scriptResult.success) {
      return {
        macroId,
        macroName: macro?.name || 'Unknown',
        passed: false,
        severity: 0.5,
        message: `Script error: ${scriptResult.error?.description || 'Unknown error'}`
      };
    }

    return this.parseScriptResult(macroId, macro?.name || macroId, scriptResult.messages);
  }

  hasViolations(context: IScheduleContext): boolean {
    const { summary } = this.evaluateAll(context);
    return summary.violations > 0;
  }

  getViolations(context: IScheduleContext): IRuleViolation[] {
    const { violations } = this.evaluateAll(context);
    return violations;
  }

  getActiveMacroIds(): string[] {
    return this.activeMacroIds();
  }

  isMacroActive(macroId: string): boolean {
    return this.activeMacroIds().includes(macroId);
  }

  recompileAll(): void {
    this.initialize();
  }

  private prepareExternalVariables(
    context: IScheduleContext,
    macro?: IMacro
  ): Record<string, unknown> {
    const existingDates: string[] = [];
    const assignmentsArray: Array<{
      shiftId: string;
      shiftName: string;
      date: string;
      startTime: string;
      endTime: string;
      hours: number;
    }> = [];

    for (const assign of context.existingAssignments) {
      existingDates.push(assign.date.toISOString().split('T')[0]);
      assignmentsArray.push({
        shiftId: assign.shiftId,
        shiftName: assign.shiftName,
        date: assign.date.toISOString(),
        startTime: assign.startTime,
        endTime: assign.endTime,
        hours: assign.hours
      });
    }

    return {
      agentId: context.agentId,
      currentDate: context.currentDate.toISOString(),
      proposedShiftId: context.proposedAssignment.shiftId,
      proposedShiftName: context.proposedAssignment.shiftName,
      proposedDate: context.proposedAssignment.date.toISOString(),
      proposedStart: context.proposedAssignment.startTime,
      proposedEnd: context.proposedAssignment.endTime,
      proposedHours: context.proposedAssignment.hours,
      existingDates: existingDates.join(';'),
      existingAssignments: JSON.stringify(assignmentsArray),
      existingCount: context.existingAssignments.length,
      workQuantCount: context.workQuants.length,
      workQuants: JSON.stringify(context.workQuants),
      maxWorkDays: this.appSettings.workSettings().schedulingMaxWorkDays,
      minRestDays: this.appSettings.workSettings().schedulingMinRestDays,
      minPauseHours: this.appSettings.workSettings().schedulingMinPauseHours,
      maxOptimalGap: this.appSettings.workSettings().schedulingMaxOptimalGap,
      maxDailyHours: this.appSettings.workSettings().schedulingMaxDailyHours,
      maxWeeklyHours: this.appSettings.workSettings().schedulingMaxWeeklyHours,
      maxConsecutiveDays: this.appSettings.workSettings().schedulingMaxConsecutiveDays
    };
  }

  private parseScriptResult(
    macroId: string,
    macroName: string,
    messages: Array<{ type: number; message: string }>
  ): IMacroRuleResult {
    let severity = 0;
    let outputMessage = 'OK';
    let hasOutput = false;

    // OUTPUT 1 = info/message, OUTPUT 2 = severity (0-1)
    for (const msg of messages) {
      if (msg.type === 2) {
        const parsedSeverity = parseFloat(msg.message);
        if (!isNaN(parsedSeverity) && parsedSeverity >= 0 && parsedSeverity <= 1) {
          severity = parsedSeverity;
          hasOutput = true;
        }
      } else if (msg.type === 1) {
        outputMessage = msg.message;
        if (msg.message !== 'OK' && !hasOutput) {
          hasOutput = true;
        }
      }
    }

    return {
      macroId,
      macroName,
      passed: severity === 0 && outputMessage === 'OK',
      severity,
      message: outputMessage
    };
  }

  private calculateSummary(results: IMacroRuleResult[]): IRuleEvaluationSummary {
    let passed = 0;
    let warnings = 0;
    let violations = 0;
    let maxSeverity = 0;

    for (const result of results) {
      if (result.passed) {
        passed++;
      } else if (result.severity < 0.5) {
        warnings++;
      } else {
        violations++;
      }

      maxSeverity = Math.max(maxSeverity, result.severity);
    }

    return {
      totalRules: results.length,
      passed,
      warnings,
      violations,
      maxSeverity,
      allPassed: passed === results.length
    };
  }

  private findMacroById(macroId: string): IMacro | undefined {
    return this.macroManagementService.macroList().find(m => m.id === macroId);
  }
}
