// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject } from '@angular/core';
import { SCRIPT_COMPILER } from 'src/app/domain/models/automation/rules/script-compiler.interface';
import { ICompiledScript } from 'src/app/domain/models/automation/rules/compiled-script.interface';

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FormulaEvaluationService {
  private scriptCompiler = inject(SCRIPT_COMPILER);
  private compilationCache = new Map<string, ICompiledScript>();

  evaluateFormula(formula: string, variables: Record<string, unknown>): string {
    const compiled = this.compileFormula(formula);
    return this.executeCompiled(compiled, variables);
  }

  compileFormula(formula: string): ICompiledScript {
    const cached = this.compilationCache.get(formula);
    if (cached) return cached;

    const source = this.buildSource(formula);
    const compiled = this.scriptCompiler.compile(source, false, true);
    this.compilationCache.set(formula, compiled);
    return compiled;
  }

  executeCompiled(compiled: ICompiledScript, variables: Record<string, unknown>): string {
    if (compiled.hasError) return '#ERR';

    try {
      const result = this.scriptCompiler.execute(compiled, variables);
      if (!result.success) return '#ERR';

      if (result.messages.length > 0) {
        return result.messages[0].message;
      }

      return '';
    } catch {
      return '#ERR';
    }
  }

  validateFormula(formula: string): FormulaValidationResult {
    const source = this.buildSource(formula);
    const compiled = this.scriptCompiler.compile(source, false, true);
    if (compiled.hasError) {
      return { valid: false, error: compiled.error?.description ?? 'Syntax error' };
    }
    return { valid: true };
  }

  clearCache(): void {
    this.compilationCache.clear();
  }

  private buildSource(formula: string): string {
    return formula;
  }
}
