// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';
import { CompiledScript } from './compiled-script';
import { ScriptExecutionContext } from './script-execution-context';
import { CancellationToken } from './cancellation-token.interface';
import { ScriptResult } from './script-result';
import { ResultMessage } from './result-message.interface';
import { ExternalVariables } from './external-variables.type';
import { IScriptCompiler } from 'src/app/domain/models/automation/rules/script-compiler.interface';

@Injectable({
  providedIn: 'root',
})
export class ScriptService implements IScriptCompiler {
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
