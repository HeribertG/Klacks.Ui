import { Opcodes } from './code';
import { SyntaxAnalyserBase } from './syntaxAnalyserBase';

export abstract class SyntaxAnalyserBuiltIns extends SyntaxAnalyserBase {
  protected callMsg(dropReturnValue: boolean) {
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('');

    this._code!.add(Opcodes.Message);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }

  protected callMsgBox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    this.actualOptionalParameter(0);
    this.actualOptionalParameter('Title');
    this._code!.add(Opcodes.Msgbox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }

  protected callInputbox(dropReturnValue: boolean) {
    this.actualOptionalParameter('');
    this.actualOptionalParameter('Title');
    this.actualOptionalParameter('');
    this.actualOptionalParameter(20);
    this.actualOptionalParameter(20);
    this._code!.add(Opcodes.Inputbox);
    if (dropReturnValue) {
      this._code!.add(Opcodes.Pop);
    }
  }
}
