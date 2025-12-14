import { CellTypeEnum, TextAlignmentEnum } from '../enums/cell-settings.enum';
import { CellIcon } from './cell-icon';

export class GridCell {
  mainText = '';
  firstSubText = '';
  secondSubText = '';
  frozen = false;
  confirmed = false;
  sealed = false;
  icons?: CellIcon[];
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
