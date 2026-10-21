// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IModelState } from './model-state.type';

export interface IModelStateDictionary {
  isValid: boolean;
  errors: IModelState;
}
