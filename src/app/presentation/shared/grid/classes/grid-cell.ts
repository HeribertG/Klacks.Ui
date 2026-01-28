import { CellTypeEnum, TextAlignmentEnum } from '../enums/cell-settings.enum';
import { CellBadge } from './cell-badge';
import { CellIcon } from './cell-icon';

export class GridCell {
  mainText = '';
  firstSubText = '';
  secondSubText = '';
  frozen = false;
  confirmed = false;
  sealed = false;
  icons?: CellIcon[];
  badges?: CellBadge[];
  cellType: CellTypeEnum = CellTypeEnum.Standard;
  mainTextAlignment: TextAlignmentEnum = TextAlignmentEnum.Center;
  subTextAlignment: TextAlignmentEnum = TextAlignmentEnum.Center;
  backgroundColor?: string;
  fontColor?: string;

  isEmpty(): boolean {
    return (
      this.mainText === '' &&
      this.firstSubText === '' &&
      this.secondSubText === ''
    );
  }
}
