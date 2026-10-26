// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { UiActionType } from './ui-action-type.type';

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
  cityFrom?: string;
  zipPrefixFrom?: string;
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
