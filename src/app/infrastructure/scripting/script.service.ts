import { Injectable } from '@angular/core';
import { CompiledScript } from './compiled-script';
import {
  ScriptExecutionContext,
  CancellationToken,
} from './script-execution-context';
import { ScriptResult, ResultMessage } from './script-result';

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
    cancellationToken?: CancellationToken
  ): ScriptResult {
    const context = new ScriptExecutionContext(script);
    return context.execute(cancellationToken);
  }

  run(
    source: string,
    optionExplicit = true,
    allowExternal = true,
    cancellationToken?: CancellationToken
  ): ScriptResult {
    const script = this.compile(source, optionExplicit, allowExternal);
    return this.execute(script, cancellationToken);
  }

  messagesToResultMessages(messages: ResultMessage[]): ResultMessage[] {
    return messages.filter((m) => m.type > 0);
  }
}
