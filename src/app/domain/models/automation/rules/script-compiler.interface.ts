import { InjectionToken } from '@angular/core';

export interface ICompiledScript {
  hasError: boolean;
  error?: string;
}

export interface IScriptMessage {
  type: number;
  message: string;
}

export interface IScriptResult {
  success: boolean;
  error?: { description: string };
  messages: IScriptMessage[];
}

export interface IScriptCompiler {
  compile(content: string, enableOutput: boolean, enableImport: boolean): ICompiledScript;
  execute(compiled: ICompiledScript, externalVars: Record<string, unknown>): IScriptResult;
}

export const SCRIPT_COMPILER = new InjectionToken<IScriptCompiler>('IScriptCompiler');
