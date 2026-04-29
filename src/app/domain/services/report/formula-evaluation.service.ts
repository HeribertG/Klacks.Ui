// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { ScriptService, ExternalVariables } from 'src/app/infrastructure/scripting/script.service';
import { CompiledScript } from 'src/app/infrastructure/scripting/compiled-script';

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FormulaEvaluationService {
  private scriptService = inject(ScriptService);
  private compilationCache = new Map<string, CompiledScript>();

  evaluateFormula(formula: string, variables: ExternalVariables): string {
    const compiled = this.compileFormula(formula);
    return this.executeCompiled(compiled, variables);
  }

  compileFormula(formula: string): CompiledScript {
    const cached = this.compilationCache.get(formula);
    if (cached) return cached;

    const source = this.buildSource(formula);
    const compiled = this.scriptService.compile(source, false, true);
    this.compilationCache.set(formula, compiled);
    return compiled;
  }

  executeCompiled(compiled: CompiledScript, variables: ExternalVariables): string {
    if (compiled.hasError) return '#ERR';

    try {
      const result = this.scriptService.execute(compiled, variables);
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
    const compiled = this.scriptService.compile(source, false, true);
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
