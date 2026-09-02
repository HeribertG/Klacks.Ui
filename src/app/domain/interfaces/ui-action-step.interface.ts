// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export type UiActionType =
  | 'navigate'
  | 'waitForElement'
  | 'setValue'
  | 'setSelect'
  | 'click'
  | 'scrollTo'
  | 'delay'
  | 'poll'
  | 'readValue'
  | 'conditional'
  | 'apiCall'
  | 'search'
  | 'selectGroup';

export interface IUiActionStep {
  action: UiActionType;
  selector?: string;
  selectorType?: 'id' | 'css';
  value?: string;
  valueFrom?: string;
  timeout?: number;
  delay?: number;
  route?: string;
  target?: string;
  routeMap?: Record<string, string>;
  routeKeyFrom?: string;
  appendParamFrom?: string;
  queryParams?: Record<string, string>;
  entityTypeFilterFrom?: string;
  pollInterval?: number;
  pollMaxAttempts?: number;
  pollCondition?: { type: string; selector?: string; value?: string };
  condition?: {
    type: string;
    selector?: string;
    key?: string;
    operator: string;
    value?: string;
  };
  thenSteps?: IUiActionStep[];
  elseSteps?: IUiActionStep[];
  resultKey?: string;
  apiUrl?: string;
  apiMethod?: string;
  apiBody?: Record<string, unknown>;
}

export interface IUiActionConfig {
  steps: IUiActionStep[];
  onError?: 'stop' | 'continue';
}

/**
 * Outcome of one UiAction config run. Needed because a config with onError 'continue' swallows its
 * step errors: without a returned verdict the caller cannot tell a fully executed action from one
 * that logged three failures and carried on, and would report success for both (W1.4).
 */
export interface IUiActionExecutionOutcome {
  succeeded: boolean;
  failedStep?: UiActionType;
  error?: string;
}

export interface IUiActionContext {
  params: Record<string, unknown>;
  results: Record<string, unknown>;
  callId: string;
}
