// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { IUiActionContext } from '../../interfaces/ui-action-step.interface';

@Injectable({ providedIn: 'root' })
export class UiActionValueResolverService {
  private static readonly PARAMS_PREFIX = 'params.';
  private static readonly RESULTS_PREFIX = 'results.';

  resolve(expression: string | undefined, context: IUiActionContext): string | undefined {
    if (expression === undefined || expression === null) {
      return undefined;
    }

    if (expression.startsWith(UiActionValueResolverService.PARAMS_PREFIX)) {
      const key = expression.substring(UiActionValueResolverService.PARAMS_PREFIX.length);
      const value = context.params[key];
      return value !== undefined && value !== null ? String(value) : undefined;
    }

    if (expression.startsWith(UiActionValueResolverService.RESULTS_PREFIX)) {
      const key = expression.substring(UiActionValueResolverService.RESULTS_PREFIX.length);
      const value = context.results[key];
      return value !== undefined && value !== null ? String(value) : undefined;
    }

    return expression;
  }

  resolveValue(step: { value?: string; valueFrom?: string }, context: IUiActionContext): string | undefined {
    if (step.valueFrom) {
      return this.resolve(step.valueFrom, context);
    }
    return step.value;
  }
}
