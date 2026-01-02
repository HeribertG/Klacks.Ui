import { Injectable } from '@angular/core';
import { CompiledScript } from './compiled-script';
import {
  ScriptExecutionContext,
  CancellationToken,
} from './script-execution-context';
import { ScriptResult, ResultMessage } from './script-result';

export type ExternalVariables = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class ScriptService {
  compile(
    source: string,
    optionExplicit = true,
    allowExternal = true
  ): CompiledScript {
    return CompiledScript.compile(source, optionExplicit, allowExternal);
  }

  execute(
    script: CompiledScript,
    externalVariables?: ExternalVariables,
    cancellationToken?: CancellationToken
  ): ScriptResult {
    if (externalVariables) {
      for (const [name, value] of Object.entries(externalVariables)) {
        script.setExternalValue(name, value);
      }
    }
    const context = new ScriptExecutionContext(script);
    return context.execute(cancellationToken);
  }

  run(
    source: string,
    optionExplicit = true,
    allowExternal = true,
    externalVariables?: ExternalVariables,
    cancellationToken?: CancellationToken
  ): ScriptResult {
    const script = this.compile(source, optionExplicit, allowExternal);
    return this.execute(script, externalVariables, cancellationToken);
  }

  messagesToResultMessages(messages: ResultMessage[]): ResultMessage[] {
    return messages.filter((m) => m.type > 0);
  }
}
