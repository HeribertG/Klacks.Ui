import { Injectable, OnDestroy } from '@angular/core';
import { SyntaxAnalyser } from './syntaxAnalyser';
import { InterpreterError } from './interpreterError';
import { StringInputStream } from './stringInput';
import { Code, Results } from './code';
import { LexicalAnalyser } from './lexicalAnalyser';
import { CompiledScript } from './compiled-script';
import {
  ScriptExecutionContext,
  CancellationToken,
} from './script-execution-context';
import { ScriptResult, ResultMessage } from './script-result';

@Injectable({
  providedIn: 'root',
})
export class ScriptService implements OnDestroy {
  public interpreterError: InterpreterError | undefined;
  private stringInput: StringInputStream | undefined;
  private lexicalAnalyser: LexicalAnalyser | undefined;
  private syntaxAnalyser: SyntaxAnalyser | undefined;
  private code: Code | undefined;

  constructor() {
    this.interpreterError = new InterpreterError();
    this.stringInput = new StringInputStream(this.interpreterError);
    this.lexicalAnalyser = new LexicalAnalyser(
      this.interpreterError,
      this.stringInput
    );
    this.syntaxAnalyser = new SyntaxAnalyser(
      this.interpreterError,
      this.lexicalAnalyser
    );
    this.code = new Code(this.interpreterError, this.stringInput);
    this.code.allowUI = false;
  }

  ngOnDestroy(): void {
    this.stringInput!.dispose();
    this.lexicalAnalyser!.dispose();
    this.syntaxAnalyser!.dispose();
    this.code!.dispose();

    this.interpreterError = undefined;
    this.stringInput = undefined;
    this.lexicalAnalyser = undefined;
    this.syntaxAnalyser = undefined;
    this.code = undefined;
  }

  compile(
    source: string,
    optionExplicit = true,
    allowExternal = true
  ): boolean {
    this.code!.clear();
    this.stringInput!.read(source + ' ');

    this.syntaxAnalyser!.parse(this.code!, optionExplicit, allowExternal);

    if (this.interpreterError!.number === 0) {
      return true;
    }
    return false;
  }

  run(): boolean {
    if (this.code!.running) {
      return false;
    }

    if (this.interpreterError!.number === 0) {
      this.code!.interpret();
      return this.interpreterError!.number === 0;
    }

    return false;
  }

  result(): Results[] {
    return this.code!.result();
  }
  clearResult() {
    this.code!.clearMessage();
  }

  debugResult(): Results[] {
    return this.code!.debugResult();
  }

  clearDebugResult() {
    this.code!.clearDebug();
  }

  public get hasNewDebugInfos(): boolean {
    return this.code!.hasNewDebugInfos;
  }

  codeStack(): unknown[][] {
    return this.code!.codeStack();
  }

  compileToScript(
    source: string,
    optionExplicit = true,
    allowExternal = true
  ): CompiledScript {
    return CompiledScript.compile(source, optionExplicit, allowExternal);
  }

  executeScript(
    script: CompiledScript,
    cancellationToken?: CancellationToken
  ): ScriptResult {
    const context = new ScriptExecutionContext(script);
    return context.execute(cancellationToken);
  }

  compileAndRun(
    source: string,
    optionExplicit = true,
    allowExternal = true,
    cancellationToken?: CancellationToken
  ): ScriptResult {
    const script = this.compileToScript(source, optionExplicit, allowExternal);
    return this.executeScript(script, cancellationToken);
  }

  resultsToResultMessages(results: Results[]): ResultMessage[] {
    return results
      .filter((r) => r.type !== undefined)
      .map((r) => ({ type: r.type!, message: r.message }));
  }
}
