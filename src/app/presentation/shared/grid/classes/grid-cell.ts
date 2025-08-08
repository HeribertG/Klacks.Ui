import { CellTypeEnum, TextAlignmentEnum } from '../enums/cell-settings.enum';

export class GridCell {
  mainText = '';
  firstSubText = '';
  secondSubText = '';
  frozen = false;
  confirmed = false;
  sealed = false;
  cellType: CellTypeEnum = CellTypeEnum.Standard;
  mainTextAlignment: TextAlignmentEnum = TextAlignmentEnum.Center;
  subTextAlignment: TextAlignmentEnum = TextAlignmentEnum.Center;

  isEmpty(): boolean {
    return (
      this.mainText === '' &&
      this.firstSubText === '' &&
      this.secondSubText === ''
    );
  }
}
