// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IUiActionConfig, IUiActionContext, IUiActionStep } from '../../interfaces/ui-action-step.interface';
import { UiActionValueResolverService } from './ui-action-value-resolver.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { ISearchStrategy, SEARCH_STRATEGY } from '../../interfaces/search-strategy.interface';

const DEFAULT_WAIT_TIMEOUT = 3000;
const POLL_INTERVAL = 200;
const DEFAULT_DELAY = 500;
const SEARCH_DELAY = 500;

@Injectable({ providedIn: 'root' })
export class UiActionEngineService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private valueResolver = inject(UiActionValueResolverService);
  private searchStateService = inject(SearchStateService);
  private searchStrategyService = inject<ISearchStrategy>(SEARCH_STRATEGY);

  async executeConfig(config: IUiActionConfig, context: IUiActionContext): Promise<void> {
    const onError = config.onError ?? 'stop';

    for (const step of config.steps) {
      try {
        await this.executeStep(step, context);
      } catch (error) {
        if (onError === 'stop') {
          throw error;
        }
        console.error(`UI action step '${step.action}' failed:`, error);
      }
    }
  }

  private async executeStep(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    switch (step.action) {
      case 'navigate':
        return this.executeNavigate(step, context);
      case 'waitForElement':
        return this.executeWaitForElement(step);
      case 'setValue':
        return this.executeSetValue(step, context);
      case 'setSelect':
        return this.executeSetSelect(step, context);
      case 'click':
        return this.executeClick(step);
      case 'scrollTo':
        return this.executeScrollTo(step);
      case 'delay':
        return this.executeDelay(step);
      case 'poll':
        return this.executePoll(step, context);
      case 'readValue':
        return this.executeReadValue(step, context);
      case 'conditional':
        return this.executeConditional(step, context);
      case 'apiCall':
        return this.executeApiCall();
      case 'search':
        return this.executeSearch(step, context);
      default:
        throw new Error(`Unknown UI action type: ${step.action}`);
    }
  }

  private async executeNavigate(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    let route = step.route;

    if (step.routeMap && step.routeKeyFrom) {
      const key = this.valueResolver.resolve(step.routeKeyFrom, context);
      if (key && step.routeMap[key]) {
        route = step.routeMap[key];
      }
    }

    if (step.appendParamFrom && route) {
      const paramValue = this.valueResolver.resolve(step.appendParamFrom, context);
      if (paramValue) {
        route = `${route}/${paramValue}`;
      }
    }

    if (!route) {
      throw new Error('Navigate action requires a route');
    }

    await this.router.navigate([route], { queryParams: step.queryParams });
  }

  private async executeWaitForElement(step: IUiActionStep): Promise<void> {
    if (!step.selector) {
      throw new Error('waitForElement action requires a selector');
    }

    const el = await this.waitForEl(step.selector, step.selectorType, step.timeout ?? DEFAULT_WAIT_TIMEOUT);
    if (!el) {
      throw new Error(`Element not found: ${step.selector}`);
    }
  }

  private async executeSetValue(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    if (!step.selector) {
      throw new Error('setValue action requires a selector');
    }

    const el = await this.waitForEl(step.selector, step.selectorType);
    if (!el) {
      throw new Error(`Element not found for setValue: ${step.selector}`);
    }

    const value = this.valueResolver.resolveValue(step, context) ?? '';
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private async executeSetSelect(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    if (!step.selector) {
      throw new Error('setSelect action requires a selector');
    }

    const el = await this.waitForEl(step.selector, step.selectorType);
    if (!el) {
      throw new Error(`Element not found for setSelect: ${step.selector}`);
    }

    const value = this.valueResolver.resolveValue(step, context) ?? '';
    (el as HTMLSelectElement).value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private async executeClick(step: IUiActionStep): Promise<void> {
    if (!step.selector) {
      throw new Error('click action requires a selector');
    }

    const el = await this.waitForEl(step.selector, step.selectorType);
    if (!el) {
      throw new Error(`Element not found for click: ${step.selector}`);
    }

    el.click();
  }

  private async executeScrollTo(step: IUiActionStep): Promise<void> {
    if (!step.selector) {
      throw new Error('scrollTo action requires a selector');
    }

    const el = await this.waitForEl(step.selector, step.selectorType);
    if (!el) {
      throw new Error(`Element not found for scrollTo: ${step.selector}`);
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private async executeDelay(step: IUiActionStep): Promise<void> {
    await new Promise(r => setTimeout(r, step.delay ?? DEFAULT_DELAY));
  }

  private async executePoll(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    const interval = step.pollInterval ?? POLL_INTERVAL;
    const maxAttempts = step.pollMaxAttempts ?? 15;
    const condition = step.pollCondition;

    if (!condition) {
      throw new Error('poll action requires a pollCondition');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const met = this.checkPollCondition(condition);
      if (met) {
        if (step.resultKey && condition.selector) {
          const el = this.findElement(condition.selector, step.selectorType);
          if (el) {
            context.results[step.resultKey] = (el as HTMLInputElement).value;
          }
        }
        return;
      }
      await new Promise(r => setTimeout(r, interval));
    }

    throw new Error(`Poll condition not met after ${maxAttempts} attempts`);
  }

  private checkPollCondition(condition: { type: string; selector?: string; value?: string }): boolean {
    switch (condition.type) {
      case 'elementExists':
        return condition.selector ? this.findElement(condition.selector) !== null : false;
      case 'elementHasValue':
        if (!condition.selector) return false;
        const el = this.findElement(condition.selector);
        return el ? (el as HTMLInputElement).value === condition.value : false;
      default:
        return false;
    }
  }

  private async executeReadValue(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    if (!step.selector) {
      throw new Error('readValue action requires a selector');
    }
    if (!step.resultKey) {
      throw new Error('readValue action requires a resultKey');
    }

    const el = await this.waitForEl(step.selector, step.selectorType);
    if (!el) {
      throw new Error(`Element not found for readValue: ${step.selector}`);
    }

    context.results[step.resultKey] = (el as HTMLInputElement).value;
  }

  private async executeConditional(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    const condition = step.condition;
    if (!condition) {
      throw new Error('conditional action requires a condition');
    }

    const conditionMet = this.evaluateCondition(condition, context);
    const stepsToExecute = conditionMet ? step.thenSteps : step.elseSteps;

    if (stepsToExecute) {
      for (const subStep of stepsToExecute) {
        await this.executeStep(subStep, context);
      }
    }
  }

  private evaluateCondition(
    condition: { type: string; key?: string; operator: string; value?: string },
    context: IUiActionContext
  ): boolean {
    switch (condition.type) {
      case 'paramExists':
        return condition.key !== undefined && context.params[condition.key] !== undefined && context.params[condition.key] !== null;
      case 'paramEquals':
        if (!condition.key) return false;
        const paramValue = context.params[condition.key];
        const paramStr = paramValue !== undefined && paramValue !== null ? String(paramValue) : undefined;
        return condition.operator === '==' ? paramStr === condition.value : paramStr !== condition.value;
      default:
        return false;
    }
  }

  private async executeApiCall(): Promise<void> {
    throw new Error('apiCall action is not yet implemented');
  }

  private async executeSearch(step: IUiActionStep, context: IUiActionContext): Promise<void> {
    const route = step.route;
    if (!route) {
      throw new Error('search action requires a route');
    }

    const searchValue = this.valueResolver.resolveValue(step, context) ?? '';
    this.searchStateService.setRestoreSearch(searchValue);

    await this.router.navigate([route]);
    await new Promise(r => setTimeout(r, SEARCH_DELAY));
    this.searchStrategyService.globalSearch(searchValue, true, false);
  }

  private findElement(selector: string, selectorType: 'id' | 'css' = 'id'): HTMLElement | null {
    return selectorType === 'css'
      ? document.querySelector<HTMLElement>(selector)
      : document.getElementById(selector);
  }

  private async waitForEl(selector: string, selectorType: 'id' | 'css' = 'id', timeout = DEFAULT_WAIT_TIMEOUT): Promise<HTMLElement | null> {
    const existing = this.findElement(selector, selectorType);
    if (existing) return existing;

    return new Promise((resolve) => {
      const interval = POLL_INTERVAL;
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += interval;
        const el = this.findElement(selector, selectorType);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (elapsed >= timeout) {
          clearInterval(timer);
          resolve(null);
        }
      }, interval);
    });
  }
}
