// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Collects validation errors per field key and reports whether a model state is valid.
 */

import { IModelStateDictionary } from './model-state-dictionary.interface';
import { ModelState } from './authentification-class';

export class ModelStateDictionary implements IModelStateDictionary {
  isValid: boolean;
  errors: ModelState;

  constructor() {
    this.isValid = true;
    this.errors = {};
  }

  addError(key: string, error: string) {
    if (!this.errors[key]) {
      this.errors[key] = [];
    }

    this.errors[key].push(error);
    this.isValid = false;
  }

  getErrors(key: string): string[] {
    return this.errors[key] || [];
  }

  hasErrors(): boolean {
    return !this.isValid;
  }
}
