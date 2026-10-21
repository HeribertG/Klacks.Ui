// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICompiledScript } from './compiled-script.interface';
import { IScriptResult } from './script-result.interface';
import { InjectionToken } from '@angular/core';

export interface IScriptCompiler {
  compile(content: string, enableOutput: boolean, enableImport: boolean): ICompiledScript;
  execute(compiled: ICompiledScript, externalVars: Record<string, unknown>): IScriptResult;
}

export const SCRIPT_COMPILER = new InjectionToken<IScriptCompiler>('IScriptCompiler');
