// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ScriptError } from './script-error';

export interface ResultMessage {
  type: number;
  message: string;
}

export interface ScriptResult {
  readonly success: boolean;
  readonly messages: ResultMessage[];
  readonly error: ScriptError | null;
}

export function scriptResultOk(messages: ResultMessage[] = []): ScriptResult {
  return {
    success: true,
    messages,
    error: null,
  };
}

export function scriptResultFail(
  error: ScriptError,
  messages: ResultMessage[] = []
): ScriptResult {
  return {
    success: false,
    messages,
    error,
  };
}
