import { Identifier } from './identifier';
import { InterpreterError } from './interpreterError';
import { LexicalAnalyser } from './lexicalAnalyser';
import { ScriptError, createScriptError } from './script-error';
import { ScriptValue } from './script-value';
import { StringInputStream } from './stringInput';
import { SyntaxAnalyser } from './syntaxAnalyser';
import { Code } from './code';

export class CompiledScript {
  private readonly _instructions: unknown[][];
  private readonly _externalSymbols: Map<string, Identifier>;
  private readonly _error: ScriptError | null;

  private constructor(
    instructions: unknown[][],
    externalSymbols: Map<string, Identifier>,
    error: ScriptError | null
  ) {
    this._instructions = instructions;
    this._externalSymbols = externalSymbols;
    this._error = error;
  }

  get instructions(): readonly unknown[][] {
    return this._instructions;
  }

  get externalSymbols(): ReadonlyMap<string, Identifier> {
    return this._externalSymbols;
  }

  get error(): ScriptError | null {
    return this._error;
  }

  get hasError(): boolean {
    return this._error !== null;
  }

  static compile(
    source: string,
    optionExplicit = true,
    allowExternal = true
  ): CompiledScript {
    const interpreterError = new InterpreterError();
    const stringInput = new StringInputStream(interpreterError);
    const lexicalAnalyser = new LexicalAnalyser(interpreterError, stringInput);
    const syntaxAnalyser = new SyntaxAnalyser(interpreterError, lexicalAnalyser);
    const code = new Code(interpreterError, stringInput);

    code.clear();
    stringInput.read(source + ' ');
    syntaxAnalyser.parse(code, optionExplicit, allowExternal);

    let error: ScriptError | null = null;
    if (interpreterError.number !== 0) {
      error = createScriptError(
        interpreterError.number,
        interpreterError.description,
        interpreterError.line,
        interpreterError.col
      );
    }

    const instructions: unknown[][] = [];
    const codeStack = code.codeStack();
    for (let i = 0; i < codeStack.length; i++) {
      instructions.push(codeStack[i] as unknown[]);
    }

    const externalSymbols = new Map<string, Identifier>();
    const external = code.external();
    for (let i = 0; i < external.cloneCount(); i++) {
      const id = external.cloneItem(i);
      if (id && id.name) {
        externalSymbols.set(id.name, id);
      }
    }

    stringInput.dispose();
    lexicalAnalyser.dispose();
    syntaxAnalyser.dispose();
    code.dispose();

    return new CompiledScript(instructions, externalSymbols, error);
  }

  setExternalValue(name: string, value: unknown): void {
    const identifier = this._externalSymbols.get(name);
    if (identifier) {
      identifier.value = ScriptValue.fromObject(value);
    } else {
      const newId = new Identifier();
      newId.name = name;
      newId.value = ScriptValue.fromObject(value);
      this._externalSymbols.set(name, newId);
    }
  }

  getExternalValue(name: string): ScriptValue | null {
    const identifier = this._externalSymbols.get(name);
    return identifier?.value ?? null;
  }

  clearExternalValues(): void {
    this._externalSymbols.clear();
  }
}
