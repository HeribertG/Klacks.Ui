/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LexicalAnalyser } from './lexicalAnalyser';
import { Sym, Tokens } from './symbol';
import { Scopes } from './scopes';
import { Opcodes, Code } from './code';
import { parsErrors, InterpreterError } from './interpreterError';
import { IdentifierTypes, Identifier } from './identifier';

enum Exits {
  exitNone = 0,
  exitDo = 1,
  exitFor = 2,
  exitFunction = 4,
  exitSub = 8,
}

export class SyntaxAnalyser {
  private _code: Code | undefined = undefined;
  private _symbol: Sym = new Sym();
  private _symbolTable: Scopes = new Scopes();
  private _optionExplicit = false;
  private _allowExternal = false;

  constructor(
    private interpreterError: InterpreterError | undefined,
    private lexicalAnalyser: LexicalAnalyser | undefined
  ) {}

  dispose() {
    this.interpreterError = undefined;
    this.lexicalAnalyser = undefined;
  }

  private getNextSymbol(): Sym {
    this._symbol = this.lexicalAnalyser!.getNextSymbol();
    return this._symbol;
  }

  parse(code: Code, optionExplicit = true, allowExternal = true): void {
    this._code = code;
    this._symbolTable = new Scopes();
    this._symbolTable.pushScope();
    this._optionExplicit = optionExplicit;
    this._allowExternal = allowExternal;

    this.interpreterError!.clear();

    this.getNextSymbol(); // Erstes Symbol lesen

    this.statementList(false, true, Exits.exitNone, [Tokens.tokEOF]);

    if (this._symbol.token !== Tokens.tokEOF) {
      this.interpreterError!.raise(
        parsErrors.errUnexpectedSymbol,
        'syntaxAnalyser.Parse',
        'Expected: end of statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private inSymbolSet(token: Tokens, tokenSet: Tokens[]): boolean {
    const res = tokenSet.findIndex((x) => x === token);

    if (res !== -1) {
      return true;
    }

    return false;
  }

  private constDeclaration(): void {
    let ident: string;
    let currentToken: Tokens;

    currentToken = this._symbol.token;

    if (currentToken === Tokens.tokIdentifier) {
      if (this._symbolTable.exists(this._symbol.text, true)) {
        this.interpreterError!.raise(
          parsErrors.errIdentifierAlreadyExists,
          'ConstDeclaration',
          'Constant identifier ' + this._symbol.text + ' is already declared',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }

      ident = this._symbol.text;

      currentToken = this.getNextSymbol().token;

      if (currentToken === Tokens.tokEq) {
        currentToken = this.getNextSymbol().token;

        if (
          currentToken === Tokens.tokNumber ||
          currentToken === Tokens.tokString
        ) {
          this._symbolTable.allocate(
            ident,
            this._symbol.value,
            IdentifierTypes.idConst
          );
          this._code!.add(Opcodes.opAllocConst, [ident, this._symbol.value]);

          this.getNextSymbol();
        } else {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.ConstDeclaration',
            'Expected: const value',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.ConstDeclaration',
          'Expected: = after const identifier',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errUnexpectedSymbol,
        'SyntaxAnalyser.ConstDeclaration',
        'Expected: const identifier',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private variableDeclaration(external: boolean): void {
    let currentToken: Tokens;
    let returnDo = false;

    currentToken = this._symbol.token;

    do {
      if (this._symbol.token === Tokens.tokIdentifier) {
        if (this._symbolTable.exists(this._symbol.text, true)) {
          this.interpreterError!.raise(
            parsErrors.errIdentifierAlreadyExists,
            'VariableDeclaration',
            'Variable identifier ' + this._symbol.text + ' is already declared',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        if (external) {
          this._symbolTable.allocate(this._symbol.text);
        } else {
          this._symbolTable.allocate(this._symbol.text);
          this._code!.add(Opcodes.opAllocVar, [this._symbol.text]);
        }

        currentToken = this.getNextSymbol().token;

        if (currentToken === Tokens.tokComma) {
          this.getNextSymbol();
        } else {
          returnDo = true;
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.VariableDeclaration',
          'Expected: variable identifier',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } while (!returnDo);
  }

  // FunctionDefinition ::= "FUNCTION" Identifier [ "(" [ Identifier { "," Identifier } ] ")" ] Statementlist "END FUNCTION"
  private functionDefinition() {
    const res: { isOk: boolean; skipFunctionPC: number } =
      this.subFunctionDefinition();
    const isOk: boolean = res.isOk;
    const skipFunctionPC: number = res.skipFunctionPC;

    if (isOk) {
      this._symbolTable.popScope(); //  lokalen Gültigkeitsbereich wieder verwerfen
      this._code!.add(Opcodes.opReturn);
      this._code!.fixUp(skipFunctionPC - 1, [this._code!.endOfCodePC]);
    }
  }

  private subFunctionDefinition(): { isOk: boolean; skipFunctionPC: number } {
    let ident: string;

    const formalParameters: any[] = [];

    const isSub = (this._symbol.token === Tokens.tokSUB) as boolean;
    let definition: Identifier = new Identifier();
    let skipFunctionPC = -1;
    let isOk = false;
    let currentToken: Tokens = Tokens.tokNone;

    currentToken = this.getNextSymbol().token;

    if (currentToken === Tokens.tokIdentifier) {
      ident = this._symbol.text; // Der Funktionsname ist immer an Position 1 in der collection

      currentToken = this.getNextSymbol().token;

      if (currentToken === Tokens.tokLeftParent) {
        currentToken = this.getNextSymbol().token;

        while (currentToken === Tokens.tokIdentifier) {
          formalParameters.push(this._symbol.text);

          currentToken = this.getNextSymbol().token;
          if (currentToken !== Tokens.tokComma) {
            break;
          }

          currentToken = this.getNextSymbol().token;
        }
        // Klammer geschlossen
        if (currentToken === Tokens.tokRightParent) {
          this.getNextSymbol();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected:  or identifier',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      }

      // Funktion im aktuellen Scope definieren
      definition = this._symbolTable.allocate(
        ident,
        null,
        (isSub
          ? IdentifierTypes.idSub
          : IdentifierTypes.idFunction) as IdentifierTypes
      );
      //  Funktionsvariable anlegen
      this._code!.add(Opcodes.opAllocVar, [ident]);

      // in der sequentiellen Codeausführung die Funktion überspringen
      skipFunctionPC = this._code!.add(Opcodes.opJump);
      definition.address = this._code!.endOfCodePC;

      // Neuen Scope für die Funktion öffnen
      this._symbolTable.pushScope();

      definition.formalParameters = [...formalParameters];

      for (let i = 0; i <= formalParameters.length - 1; i++) {
        this._symbolTable.allocate(
          formalParameters[i],
          null,
          IdentifierTypes.idVariable
        );
      }

      currentToken = this._symbol.token;
      this.statementList(
        false,
        true,
        isSub ? Exits.exitSub : Exits.exitFunction,
        [Tokens.tokEOF, Tokens.tokEND, Tokens.tokENDFUNCTION, Tokens.tokENDSUB]
      );

      currentToken = this._symbol.token;
      if (
        currentToken === Tokens.tokENDFUNCTION ||
        currentToken === Tokens.tokENDSUB
      ) {
        if (isSub && this._symbol.token !== Tokens.tokENDSUB) {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected: END SUB or ENDSUB at end of sub body',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        currentToken = this.getNextSymbol().token;
        isOk = true;
        return { isOk, skipFunctionPC };
      } else if (currentToken === Tokens.tokEND) {
        currentToken = this.getNextSymbol().token;

        if (isSub) {
          if (currentToken === Tokens.tokSUB) {
            this.getNextSymbol();
            isOk = true;
            return { isOk, skipFunctionPC };
          } else {
            this.interpreterError!.raise(
              parsErrors.errSyntaxViolation,
              'SyntaxAnalyser.FunctionDefinition',
              'Expected: END SUB or ENDSUB at end of sub body',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
          }
        } else if (currentToken === Tokens.tokFUNCTION) {
          this.getNextSymbol();
          isOk = true;
          return { isOk, skipFunctionPC };
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FunctionDefinition',
            'Expected: END FUNCTION or ENDFUNCTION at end of function body',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.FunctionDefinition',
          'Expected: END FUNCTION or ENDFUNCTION, END SUB or ENDSUB at end of function body',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FunctionDefinition',
        'Function/Sub name is missing in definition',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    return { isOk, skipFunctionPC };
  }

  private FORStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let counterVariable = '';
    let currentToken: Tokens;

    currentToken = this._symbol.token;

    if (currentToken === Tokens.tokIdentifier) {
      let forPC: number;
      let pushExitAddrPC: number;
      let thisFORisSingleLineOnly: boolean;

      if (
        this._optionExplicit &&
        !this._symbolTable.exists(
          this._symbol.text,
          undefined,
          IdentifierTypes.idVariable
        )
      ) {
        this.interpreterError!.raise(
          parsErrors.errIdentifierAlreadyExists,
          'SyntaxAnalyser.FORStatement',
          'Variable ' + this._symbol.text + ' not declared',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }

      counterVariable = this._symbol.text;
      currentToken = this.getNextSymbol().token;

      if (currentToken === Tokens.tokEq) {
        currentToken = this.getNextSymbol().token;
        this.condition();
        currentToken = this._symbol.token;

        this._code!.add(Opcodes.opAssign, [counterVariable]);
        currentToken = this._symbol.token;

        if (currentToken === Tokens.tokTO) {
          currentToken = this.getNextSymbol().token;
          this.condition();
          currentToken = this._symbol.token;

          if (this._symbol.token === Tokens.tokSTEP) {
            this.getNextSymbol();
            this.condition();
            currentToken = this._symbol.token;
          } else {
            this._code!.add(Opcodes.opPushValue, [1]);
          }

          pushExitAddrPC = this._code!.add(Opcodes.opPushValue);

          forPC = this._code!.endOfCodePC;

          thisFORisSingleLineOnly = !(
            this._symbol.token === Tokens.tokStatementDelimiter &&
            this._symbol.text === '\n'
          );

          if (currentToken === Tokens.tokStatementDelimiter) {
            currentToken = this.getNextSymbol().token;
          }

          singleLineOnly = singleLineOnly || thisFORisSingleLineOnly;

          this.statementList(
            singleLineOnly,
            false,
            Exits.exitFor || exitsAllowed,
            [Tokens.tokEOF, Tokens.tokNEXT]
          );

          if (this._symbol.token === Tokens.tokNEXT) {
            currentToken = this.getNextSymbol().token;
          } else if (!thisFORisSingleLineOnly) {
            this.interpreterError!.raise(
              parsErrors.errSyntaxViolation,
              'SyntaxAnalyser.FORStatement',
              'Expected: NEXT at end of FOR-statement',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
          }

          this._code!.add(Opcodes.opPopWithIndex, [1]);

          this._code!.add(Opcodes.opPushVariable, [counterVariable]);

          this._code!.add(Opcodes.opAdd);

          this._code!.add(Opcodes.opAssign, [counterVariable]);

          this._code!.add(Opcodes.opPopWithIndex, [2]);

          this._code!.add(Opcodes.opPushVariable, [counterVariable]);

          this._code!.add(Opcodes.opGEq);

          this._code!.add(Opcodes.opJumpTrue, [forPC]);

          this._code!.add(Opcodes.opPop);

          this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);

          this._code!.add(Opcodes.opPop);

          this._code!.add(Opcodes.opPop);
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.FORStatement',
            'Expected: TO after start value of FOR-statement',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.FORStatement',
          'Expected: = after counter variable',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.FORStatement',
        'Counter variable missing in FOR-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private DoStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let conditionPC = -1;
    let doPC = -1;
    let pushExitAddrPC = -1;
    let thisDOisSingleLineOnly = false;
    let doWhile = false;
    let currentToken: Tokens = Tokens.tokNone;

    currentToken = this._symbol.token;

    pushExitAddrPC = this._code!.add(Opcodes.opPushValue);
    doPC = this._code!.endOfCodePC;
    if (currentToken === Tokens.tokWHILE) {
      doWhile = true;

      currentToken = this.getNextSymbol().token;
      this.condition();

      conditionPC = this._code!.add(Opcodes.opJumpFalse);
    }

    thisDOisSingleLineOnly = !(
      this._symbol.token === Tokens.tokStatementDelimiter &&
      this._symbol.text === '\n'
    );

    if (this._symbol.token === Tokens.tokStatementDelimiter) {
      currentToken = this.getNextSymbol().token;
    }

    singleLineOnly = singleLineOnly || thisDOisSingleLineOnly;

    // DO-body
    this.statementList(singleLineOnly, false, Exits.exitDo || exitsAllowed, [
      Tokens.tokEOF,
      Tokens.tokLOOP,
    ]);

    currentToken = this._symbol.token;

    let loopWhile: boolean;
    if (currentToken === Tokens.tokLOOP) {
      currentToken = this.getNextSymbol().token;
      if (
        currentToken === Tokens.tokWHILE ||
        currentToken === Tokens.tokUNTIL
      ) {
        if (doWhile) {
          this.interpreterError!.raise(
            parsErrors.errUnexpectedSymbol,
            'SyntaxAnalyser.DoStatement',
            'No  WHILE UNTIL  allowed after  LOOP  in DO-WHILE-statement',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index
          );
        }

        loopWhile = this._symbol.token === Tokens.tokWHILE;

        this.getNextSymbol();
        this.condition();

        this._code!.add(
          (loopWhile ? Opcodes.opJumpTrue : Opcodes.opJumpFalse) as Opcodes,
          [doPC]
        );

        this._code!.add(Opcodes.opPop);

        this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);
      } else {
        this._code!.add(Opcodes.opJump, [doPC]);
        if (doWhile) {
          this._code!.fixUp(conditionPC - 1, [this._code!.endOfCodePC]);
        }

        this._code!.add(Opcodes.opPop);

        this._code!.fixUp(pushExitAddrPC - 1, [this._code!.endOfCodePC]);
      }
    } else if (!(doWhile && thisDOisSingleLineOnly)) {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.DoStatement',
        'LOOP is missing at end of DO-statement',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index
      );
    }
  }

  private IFStatement(singleLineOnly: boolean, exitsAllowed: number) {
    let thisIFisSingleLineOnly: boolean;
    this.condition();
    let thenPC = 0;
    let elsePC = 0;

    let currentToken: Tokens;

    currentToken = this._symbol.token;
    if (currentToken === Tokens.tokTHEN) {
      currentToken = this.getNextSymbol().token;

      thisIFisSingleLineOnly = !(
        this._symbol.token === Tokens.tokStatementDelimiter &&
        this._symbol.text === '\n'
      );

      if (this._symbol.token === Tokens.tokStatementDelimiter) {
        currentToken = this.getNextSymbol().token;
      }

      singleLineOnly = singleLineOnly || thisIFisSingleLineOnly;

      thenPC = this._code!.add(Opcodes.opJumpFalse);

      this.statementList(singleLineOnly, false, exitsAllowed, [
        Tokens.tokEOF,
        Tokens.tokELSE,
        Tokens.tokEND,
        Tokens.tokENDIF,
      ]);

      currentToken = this._symbol.token;

      if (currentToken === Tokens.tokELSE) {
        elsePC = this._code!.add(Opcodes.opJump);

        this._code!.fixUp(thenPC - 1, [elsePC]);
        currentToken = this.getNextSymbol().token;

        this.statementList(singleLineOnly, false, exitsAllowed, [
          Tokens.tokEOF,
          Tokens.tokEND,
          Tokens.tokENDIF,
        ]);
        currentToken = this._symbol.token;
      }

      if (currentToken === Tokens.tokEND) {
        currentToken = this.getNextSymbol().token;
        if (currentToken === Tokens.tokIF) {
          currentToken = this.getNextSymbol().token;
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.IFStatement',
            'END IF or ENDIF expected to close IF-statement',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }
      } else if (currentToken === Tokens.tokENDIF) {
        currentToken = this.getNextSymbol().token;
      } else if (!thisIFisSingleLineOnly) {
        this.interpreterError!.raise(
          parsErrors.errSyntaxViolation,
          'SyntaxAnalyser.IFStatement',
          'END IF or ENDIF expected to close IF-statement',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errSyntaxViolation,
        'SyntaxAnalyser.IFStatement',
        'THEN missing after IF',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    if (elsePC === 0) {
      this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);
    } else {
      this._code!.fixUp(elsePC - 1, [this._code!.endOfCodePC]);
    }
  }
  // Einstieg für die Auswertung math. Ausdrücke (s.a. Expression())
  private condition() {
    // ConditionalTerm { "OR" ConditionalTerm }
    this.conditionalTerm();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokOR])) {
      let currentToken: Tokens;

      currentToken = this.getNextSymbol().token;
      this.conditionalTerm();

      this._code!.add(Opcodes.opOr);
    }
  }

  private conditionalTerm() {
    let currentToken: Tokens;
    const operandPCs = [];

    this.conditionalFactor();

    while (this.inSymbolSet(this._symbol.token, [Tokens.tokAND])) {
      operandPCs.push(this._code!.add(Opcodes.opJumpFalse));

      currentToken = this.getNextSymbol().token;

      this.conditionalFactor();
    }

    let thenPC: number;
    if (operandPCs.length > 0) {
      operandPCs.push(this._code!.add(Opcodes.opJumpFalse));

      this._code!.add(Opcodes.opPushValue, [true]);

      thenPC = this._code!.add(Opcodes.opJump);

      for (let i = 0; i < operandPCs.length; i++) {
        this._code!.fixUp(operandPCs[i] - 1, [this._code!.endOfCodePC]);
      }

      this._code!.add(Opcodes.opPushValue, [false]);

      this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);
    }
  }

  private conditionalFactor() {
    //  Expression { ( "=" | "<>" | "<=" | "<" | ">=" | ">" ) Expression }
    let operator: Tokens;
    let currentToken: Tokens;

    this.expression();
    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokEq,
        Tokens.tokNotEq,
        Tokens.tokLEq,
        Tokens.tokLT,
        Tokens.tokGEq,
        Tokens.tokGT,
      ])
    ) {
      operator = this._symbol.token;

      currentToken = this.getNextSymbol().token;

      this.expression();

      switch (operator) {
        case Tokens.tokEq:
          this._code!.add(Opcodes.opEq);
          break;
        case Tokens.tokNotEq:
          this._code!.add(Opcodes.opNotEq);
          break;
        case Tokens.tokLEq:
          this._code!.add(Opcodes.opLEq);
          break;
        case Tokens.tokLT:
          this._code!.add(Opcodes.oplt);
          break;
        case Tokens.tokGEq:
          this._code!.add(Opcodes.opGEq);
          break;
        case Tokens.tokGT:
          this._code!.add(Opcodes.opGt);
          break;
      }
    }
  }

  private expression() {
    //  Term { ("+" | "-" | "%" | "MOD" | "&") Term }
    let operator: Tokens;
    let currentToken: Tokens;

    this.term();
    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokPlus,
        Tokens.tokMinus,
        Tokens.tokMod,
        Tokens.tokStringConcat,
      ])
    ) {
      operator = this._symbol.token;

      currentToken = this.getNextSymbol().token;

      this.term();

      switch (operator) {
        case Tokens.tokPlus:
          this._code!.add(Opcodes.opAdd);
          break;
        case Tokens.tokMinus:
          this._code!.add(Opcodes.opSub);
          break;
        case Tokens.tokMod:
          this._code!.add(Opcodes.opMod);
          break;
        case Tokens.tokStringConcat:
          this._code!.add(Opcodes.opStringConcat);
          break;
      }
    }
  }

  private term() {
    //  Factor { ("*" | "/" | "\" | "DIV") Factor }
    let operatorRenamed: Tokens;
    let currentToken: Tokens;

    this.factor();
    while (
      this.inSymbolSet(this._symbol.token, [
        Tokens.tokMultiplication,
        Tokens.tokDivision,
        Tokens.tokDiv,
      ])
    ) {
      operatorRenamed = this._symbol.token;
      currentToken = this.getNextSymbol().token;

      this.factor();
      //  Code-Generation
      switch (operatorRenamed) {
        case Tokens.tokMultiplication:
          this._code!.add(Opcodes.opMultiplication);
          break;
        case Tokens.tokDivision:
          this._code!.add(Opcodes.opDivision);
          break;
        case Tokens.tokDiv:
          this._code!.add(Opcodes.opDiv);
          break;
      }
    }
  }

  private factor() {
    //  Factorial [ "^" Factorial ]
    let currentToken: Tokens;

    this.factorial();
    if (this._symbol.token === Tokens.tokPower) {
      currentToken = this.getNextSymbol().token;

      this.factorial();

      this._code!.add(Opcodes.opPower);
    }
  }
  // Fakultät
  private factorial() {
    //  Terminal [ "!" ]
    this.terminal();
    if (this._symbol.token === Tokens.tokFactorial) {
      this._code!.add(Opcodes.opFactorial);
      this.getNextSymbol();
    }
  }
  //  Terminale Symbole (Zahlen, Identifier) und Funktionsaufrufe
  private terminal() {
    let currentToken = this._symbol.token;

    let thenPC: number;
    let elsePC: number;
    let ident: string;
    switch (currentToken) {
      case Tokens.tokMinus:
        currentToken = this.getNextSymbol().token;
        this.terminal();

        this._code!.add(Opcodes.opNegate);
        break;
      case Tokens.tokNOT:
        currentToken = this.getNextSymbol().token;
        this.terminal();

        this._code!.add(Opcodes.opNot);
        break;
      case Tokens.tokNumber:
        this._code!.add(Opcodes.opPushValue, this._symbol.value);

        currentToken = this.getNextSymbol().token;

        break;
      case Tokens.tokString:
        this._code!.add(Opcodes.opPushValue, this._symbol.value);
        this.getNextSymbol();

        break;
      case Tokens.tokIdentifier: //  Variable/Konstante oder Funktionsaufruf
        // eslint-disable-next-line no-case-declarations
        const text = this._symbol.text;

        if (this._optionExplicit && !this._symbolTable.exists(text)) {
          this.interpreterError!.raise(
            parsErrors.errIdentifierAlreadyExists,
            'SyntaxAnalyser.Terminal',
            'Identifier ' + text + ' has not be declared',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        if (
          this._symbolTable.exists(text, undefined, IdentifierTypes.idFunction)
        ) {
          ident = text;
          currentToken = this.getNextSymbol().token;

          this.callUserDefinedFunction(ident);
          this._code!.add(Opcodes.opPushVariable, [ident]);
        } else if (
          this._symbolTable.exists(text, undefined, IdentifierTypes.idSub)
        ) {
          this.interpreterError!.raise(
            parsErrors.errCannotCallSubInExpression,
            'SyntaxAnalyser.Terminal',
            'Cannot call sub ' + text + ' in expression',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index
          );
        } else {
          // Wert einer Variablen bzw. Konstante auf den Stack legen
          this._code!.add(Opcodes.opPushVariable, [text]);

          currentToken = this.getNextSymbol().token;
        }

        break;
      case Tokens.tokTrue:
        this._code!.add(Opcodes.opPushValue, [true]);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokFalse:
        this._code!.add(Opcodes.opPushValue, [false]);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokPI:
        this._code!.add(Opcodes.opPushValue, [3.141592654]);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokCrlf:
        this._code!.add(Opcodes.opPushValue, ['\r\n']);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokTab:
        this._code!.add(Opcodes.opPushValue, ['\t']);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokCr:
        this._code!.add(Opcodes.opPushValue, ['\r']);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokLf:
        this._code!.add(Opcodes.opPushValue, ['\n']);
        currentToken = this.getNextSymbol().token;
        break;
      case Tokens.tokMsgbox:
      case Tokens.tokInputbox:
      case Tokens.tokMessage:
        this.subTerminalMessage();
        break;
      case Tokens.tokSin:
      case Tokens.tokCos:
      case Tokens.tokTan:
      case Tokens.tokATan:
        this.subTerminalSinCosTanAtan();
        break;
      case Tokens.tokIIF:
        //  "IIF" "(" Condition "," Condition "," Condition ")"
        currentToken = this.getNextSymbol().token;
        if (currentToken === Tokens.tokLeftParent) {
          currentToken = this.getNextSymbol().token;
          this.condition();

          thenPC = this._code!.add(Opcodes.opJumpFalse);
          if (currentToken === Tokens.tokComma) {
            currentToken = this.getNextSymbol().token;
            this.condition();

            elsePC = this._code!.add(Opcodes.opJump);
            this._code!.fixUp(thenPC - 1, [this._code!.endOfCodePC]);
            if (currentToken === Tokens.tokComma) {
              currentToken = this.getNextSymbol().token;
              this.condition();

              this._code!.fixUp(elsePC - 1, [this._code!.endOfCodePC]);
              if (currentToken === Tokens.tokRightParent) {
                currentToken = this.getNextSymbol().token;
              } else {
                this.interpreterError!.raise(
                  parsErrors.errMissingClosingParent,
                  'syntaxAnalyser.Terminal',
                  'Missing closing bracket after last IIF-parameter',
                  this._symbol.line,
                  this._symbol.col,
                  this._symbol.index,
                  this._symbol.text
                );
              }
            } else {
              this.interpreterError!.raise(
                parsErrors.errMissingComma,
                'syntaxAnalyser.Terminal',
                'Missing  after true-value of IIF',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            }
          } else {
            this.interpreterError!.raise(
              parsErrors.errMissingComma,
              'syntaxAnalyser.Terminal',
              'Missing after IIF-condition',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
          }
        } else {
          this.interpreterError!.raise(
            parsErrors.errMissingLeftParent,
            'SyntaxAnalyser.Terminal',
            'Missing opening bracket after IIF',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        break;
      case Tokens.tokLeftParent:
        //  "(" Condition ")"
        currentToken = this.getNextSymbol().token;
        this.condition();
        currentToken = this._symbol.token;
        if (currentToken === Tokens.tokRightParent) {
          currentToken = this.getNextSymbol().token;
        } else {
          this.interpreterError!.raise(
            parsErrors.errMissingClosingParent,
            'syntaxAnalyser.Terminal',
            'Missing closing bracket ',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        break;
      case Tokens.tokEOF:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Terminal',
          'Identifier or function or expected but end of source found',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;
      default:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Terminal',
          'Expected: expression; found symbol ' + this._symbol.text,
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;
    }
  }

  private subTerminalMessage() {
    let currentToken: Tokens;
    const operatorRenamed = this._symbol.token;

    currentToken = this.getNextSymbol().token;
    if (currentToken === Tokens.tokLeftParent) {
      currentToken = this.getNextSymbol().token;
      switch (operatorRenamed) {
        case Tokens.tokMsgbox:
          this.callMsgBox(false);
          currentToken = this._symbol.token;
          break;
        case Tokens.tokInputbox:
          this.callInputbox(false);
          currentToken = this._symbol.token;
          break;
        case Tokens.tokMessage:
          this.callMsg(false);
          currentToken = this._symbol.token;
          break;
      }

      if (currentToken === Tokens.tokRightParent) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errMissingClosingParent,
          'SyntaxAnalyser.Terminal',
          'Missing closing bracket after function parameters',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket  in function call',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private subTerminalSinCosTanAtan() {
    //  ( "SIN" | "COS" | "TAN" | "ATAN" ) "(" Condition ")"
    let currentToken: Tokens;
    const operatorRenamed = this._symbol.token;

    currentToken = this.getNextSymbol().token;
    if (currentToken === Tokens.tokLeftParent) {
      currentToken = this.getNextSymbol().token;
      this.condition();
      currentToken = this._symbol.token;
      if (currentToken === Tokens.tokRightParent) {
        this.getNextSymbol();

        switch (operatorRenamed) {
          case Tokens.tokSin:
            this._code!.add(Opcodes.opSin);
            break;
          case Tokens.tokCos:
            this._code!.add(Opcodes.opCos);
            break;
          case Tokens.tokTan:
            this._code!.add(Opcodes.opTan);
            break;
          case Tokens.tokATan:
            this._code!.add(Opcodes.opATan);
            break;
        }
      } else {
        this.interpreterError!.raise(
          parsErrors.errMissingClosingParent,
          'SyntaxAnalyser.Terminal',
          'Missing closing bracket after function parameter',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    } else {
      this.interpreterError!.raise(
        parsErrors.errMissingLeftParent,
        'SyntaxAnalyser.Terminal',
        'Missing opening bracket after function name',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }
  }

  private callMsg(dropReturnValue: boolean) {
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('');

    this._code!.add(Opcodes.opMessage);
    if (dropReturnValue) {
      this._code!.add(Opcodes.opPop);
    }
  }

  private callMsgBox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('Title');
    //  Code-Generation
    this._code!.add(Opcodes.opMsgBox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.opPop);
    }
  }

  private callInputbox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    //  Prompt
    this.actualOptionalParameter('Title');
    //  Title
    this.actualOptionalParameter('');
    //  Default
    this.actualOptionalParameter(20);
    //  xPos
    this.actualOptionalParameter(20);
    //  yPos
    this._code!.add(Opcodes.opInputBox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.opPop);
    }
  }

  private actualOptionalParameter(defaultRenamed: any) {
    const token = this._symbol.token;
    let currentToken: Tokens;

    if (
      token === Tokens.tokComma ||
      token === Tokens.tokStatementDelimiter ||
      token === Tokens.tokEOF ||
      token === Tokens.tokRightParent
    ) {
      this._code!.add(Opcodes.opPushValue, [defaultRenamed]);
    } else {
      //  Parameterwert bestimmen
      this.condition();
    }

    if (this._symbol.token === Tokens.tokComma) {
      currentToken = this.getNextSymbol().token;
    }
  }

  callUserDefinedFunction(ident: string) {
    let requireRightParent = false;

    // Identifier überhaupt als Funktion definiert?
    if (
      !this._symbolTable.exists(
        ident,
        undefined,
        IdentifierTypes.idSubOfFunction
      )
    ) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Function/Sub ' + ident + ' not declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        ident
      );
    }

    if (this._symbol.token === Tokens.tokLeftParent) {
      requireRightParent = true;
      this.getNextSymbol();
    }

    let definition: Identifier;
    definition = this._symbolTable.retrieve(ident);

    this._code!.add(Opcodes.opPushScope);

    let n = 0;
    let i: number;
    let currentToken: Tokens;
    currentToken = this._symbol.token;

    if (
      currentToken === Tokens.tokStatementDelimiter ||
      currentToken === Tokens.tokEOF
    ) {
      n = 0;
    } else {
      do {
        if (n > definition.formalParameters.length - 1) {
          break;
        }

        if (n > 0) {
          currentToken = this.getNextSymbol().token;
        }

        this.condition(); //  Wert des n-ten Parameters auf den Stack legen
        currentToken = this._symbol.token;
        n += 1;
      } while (currentToken === Tokens.tokComma);
    }

    if (definition.formalParameters.length !== n) {
      this.interpreterError!.raise(
        parsErrors.errWrongNumberOfParams,
        'SyntaxAnalyser.Statement',
        'Wrong number of parameters in call to function ' +
          ident +
          ' ' +
          definition.formalParameters.length +
          ' expected but ' +
          n +
          ' found',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        this._symbol.text
      );
    }

    for (i = definition.formalParameters.length - 1; i >= 0; i--) {
      this._code!.add(Opcodes.opAllocVar, [definition.formalParameters[i]]);
      this._code!.add(Opcodes.opAssign, [definition.formalParameters[i]]);
    }

    if (requireRightParent) {
      if (this._symbol.token === Tokens.tokRightParent) {
        this.getNextSymbol();
      } else {
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Statement',
          'Expected:  after function parameters',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
      }
    }

    // --- Funktion rufen
    this._code!.add(Opcodes.opCall, [definition.address]);

    this._code!.add(Opcodes.opPopScope);
  }

  private statement(
    singleLineOnly: boolean,
    allowFunctionDeclarations: boolean,
    exitsAllowed: number
  ) {
    let Ident: string;
    let currentToken: Tokens;

    switch (this._symbol.token) {
      case Tokens.tokEXTERNAL:
        if (this._allowExternal) {
          currentToken = this.getNextSymbol().token;
          this.variableDeclaration(true);
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'IMPORT declarations not allowed',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        break;
      case Tokens.tokCONST:
        currentToken = this.getNextSymbol().token;

        this.constDeclaration();

        break;
      case Tokens.tokDIM:
        currentToken = this.getNextSymbol().token;

        this.variableDeclaration(false);
        break;
      case Tokens.tokFUNCTION:
        if (allowFunctionDeclarations) {
          this.functionDefinition();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'No function declarations allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        break;
      case Tokens.tokSUB:
        if (allowFunctionDeclarations) {
          this.functionDefinition();
        } else {
          this.interpreterError!.raise(
            parsErrors.errSyntaxViolation,
            'SyntaxAnalyser.Statement',
            'No function declarations allowed at this point',
            this._symbol.line,
            this._symbol.col,
            this._symbol.index,
            this._symbol.text
          );
        }

        break;
      case Tokens.tokIF:
        currentToken = this.getNextSymbol().token;
        this.IFStatement(singleLineOnly, exitsAllowed);

        break;
      case Tokens.tokFOR:
        currentToken = this.getNextSymbol().token;
        this.FORStatement(singleLineOnly, exitsAllowed);

        break;
      case Tokens.tokDO:
        currentToken = this.getNextSymbol().token;
        this.DoStatement(singleLineOnly, exitsAllowed);

        break;
      case Tokens.tokEXIT:
        currentToken = this.getNextSymbol().token;
        switch (currentToken) {
          case Tokens.tokDO:
            if (exitsAllowed && Exits.exitDo === Exits.exitDo) {
              this._code!.add(Opcodes.opJumpPop);
            } else {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'EXIT DO not allowed at this point',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            }

            break;
          case Tokens.tokFOR:
            if ((exitsAllowed && Exits.exitFor) === Exits.exitFor) {
              this._code!.add(Opcodes.opJumpPop);
            } else {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'EXIT FOR not allowed at this point',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            }

            break;
          case Tokens.tokSUB:
            if ((exitsAllowed && Exits.exitSub) === Exits.exitSub) {
              this._code!.add(Opcodes.opReturn);
            } else if (
              (exitsAllowed && Exits.exitFunction) === Exits.exitFunction
            ) {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'Expected: EXIT FUNCTION in function',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            } else {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'EXIT SUB not allowed at this point',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            }

            break;
          case Tokens.tokFUNCTION:
            if ((exitsAllowed && Exits.exitFunction) === Exits.exitFunction) {
              this._code!.add(Opcodes.opReturn);
            } else if ((exitsAllowed && Exits.exitSub) === Exits.exitSub) {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'Expected: EXIT SUB in sub',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            } else {
              this.interpreterError!.raise(
                parsErrors.errUnexpectedSymbol,
                'SyntaxAnalyser.Statement',
                'EXIT FUNCTION not allowed at this point',
                this._symbol.line,
                this._symbol.col,
                this._symbol.index,
                this._symbol.text
              );
            }

            break;
          default:
            this.interpreterError!.raise(
              parsErrors.errUnexpectedSymbol,
              'SyntaxAnalyser.Statement',
              'Expected: DO or FOR or FUNCTION after EXIT',
              this._symbol.line,
              this._symbol.col,
              this._symbol.index,
              this._symbol.text
            );
            break;
        }

        currentToken = this.getNextSymbol().token;

        break;
      case Tokens.tokDebugPrint:
        currentToken = this.getNextSymbol().token;

        this.actualOptionalParameter('');

        this._code!.add(Opcodes.opDebugPrint);

        break;
      case Tokens.tokDebugClear:
        this._code!.add(Opcodes.opDebugClear);
        this.getNextSymbol();

        break;
      case Tokens.tokDebugShow:
        this._code!.add(Opcodes.opDebugShow);
        this.getNextSymbol();

        break;
      case Tokens.tokDebugHide:
        this._code!.add(Opcodes.opDebugHide);
        this.getNextSymbol();
        //  Message [ MessageTyp [ "," MessageExpression  ] ]
        break;
      case Tokens.tokMessage:
        this.getNextSymbol();
        this.callMsg(true);
        //  MsgBox [ MessageExpression [ "," ButtonExpression [ "," TitleExpression ] ] ]
        break;
      case Tokens.tokMsgbox:
        this.getNextSymbol();
        this.callMsgBox(true);

        break;
      case Tokens.tokDoEvents:
        this._code!.add(Opcodes.opDoEvents);
        this.getNextSymbol();
        //  Inputbox [ Prompt [ "," Title [ "," Default [ "," xPos [ "," yPos ] ] ] ] ]
        break;
      case Tokens.tokInputbox:
        this.getNextSymbol();
        this.callInputbox(true);

        break;
      case Tokens.tokIdentifier: //  Ein Identifier: entweder es liegt eine Zuweisung vor oder ein Funktionsaufruf.
        Ident = this._symbol.text;
        currentToken = this.getNextSymbol().token;
        switch (currentToken) {
          case Tokens.tokEq:
          case Tokens.tokPlusEq:
          case Tokens.tokMinusEq:
          case Tokens.tokMultiplicationEq:
          case Tokens.tokDivisionEq:
          case Tokens.tokStringConcatEq:
          case Tokens.tokDivEq:
          case Tokens.tokModEq:
            this.statementComparativeOperators(Ident);
            break;
          default:
            this.callUserDefinedFunction(Ident);
        }
        break;
      default:
        this.interpreterError!.raise(
          parsErrors.errUnexpectedSymbol,
          'SyntaxAnalyser.Statement',
          'Expected: declaration, function call or assignment',
          this._symbol.line,
          this._symbol.col,
          this._symbol.index,
          this._symbol.text
        );
        break;
    }
  }

  private statementComparativeOperators(Ident: string): void {
    const op = this._symbol.token;

    if (this._symbolTable.exists(Ident, undefined, IdentifierTypes.idConst)) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Assignment to constant ' + Ident + ' not allowed',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        Ident
      );
    }

    if (
      this._optionExplicit &&
      !this._symbolTable.exists(
        Ident,
        undefined,
        IdentifierTypes.idIsVariableOfFunction
      )
    ) {
      this.interpreterError!.raise(
        parsErrors.errIdentifierAlreadyExists,
        'Statement',
        'Variable/Function ' + Ident + ' not declared',
        this._symbol.line,
        this._symbol.col,
        this._symbol.index,
        Ident
      );
    }

    if (op !== Tokens.tokEq) {
      this._code!.add(Opcodes.opPushVariable, [Ident]);
    }

    this.getNextSymbol();
    this.condition();

    switch (op) {
      case Tokens.tokPlusEq:
        this._code!.add(Opcodes.opAdd);
        break;
      case Tokens.tokMinusEq:
        this._code!.add(Opcodes.opSub);
        break;
      case Tokens.tokMultiplicationEq:
        this._code!.add(Opcodes.opMultiplication);
        break;
      case Tokens.tokDivisionEq:
        this._code!.add(Opcodes.opDivision);
        break;
      case Tokens.tokStringConcatEq:
        this._code!.add(Opcodes.opStringConcat);
        break;
      case Tokens.tokDivEq:
        this._code!.add(Opcodes.opDiv);
        break;
      case Tokens.tokModEq:
        this._code!.add(Opcodes.opMod);
        break;
    }

    this._code!.add(Opcodes.opAssign, [Ident]);
  }

  private statementList(
    singleLineOnly: boolean,
    allowFunctionDeclarations: boolean,
    exitsAllowed: number,
    endSymbols: Tokens[]
  ) {
    let exitFunction = false;
    let currentToken: Tokens;

    do {
      currentToken = this._symbol.token;

      if (currentToken === undefined) {
        return;
      }

      while (currentToken === Tokens.tokStatementDelimiter) {
        if (this._symbol.text === '\n' && singleLineOnly) {
          return;
        }

        currentToken = this.getNextSymbol().token;
      }

      if (endSymbols.find((x) => x === currentToken) !== undefined) {
        exitFunction = true;
      }

      if (!exitFunction) {
        //  Alles ok, die nächste Anweisung liegt an...
        this.statement(singleLineOnly, allowFunctionDeclarations, exitsAllowed);
      }
    } while (!exitFunction);
  }
}
