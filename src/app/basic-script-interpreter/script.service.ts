/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter, Injectable, Output, OnDestroy } from '@angular/core';
import { SyntaxAnalyser } from './parser';
import { InterpreterError } from './interpreterError';
import { StringInput } from './stringInput';
import { Code, Results } from './code';
import { LexicalAnalyser } from './lexicalAnalyser';

@Injectable({
  providedIn: 'root',
})
export class ScriptService implements OnDestroy {
  public interpreterError: InterpreterError | undefined;
  private stringInput: StringInput | undefined;
  private lexicalAnalyser: LexicalAnalyser | undefined;
  private syntaxAnalyser: SyntaxAnalyser | undefined;
  private code: Code | undefined;

  constructor() {
    this.interpreterError = new InterpreterError();
    this.stringInput = new StringInput(this.interpreterError);
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

  codeStack(): any[] {
    return this.code!.codeStack();
  }
}
