import { Injectable } from '@angular/core';
import {
  MyPosition,
  MyPositionCollection,
} from 'src/app/grid/classes/position';
import { DataService } from './data.service';
import { SettingsService } from './settings.service';
import { ClipboardModeEnum } from 'src/app/grid/enums/divers';

@Injectable()
export class CellManipulationService {
  public PositionCollection = new MyPositionCollection();
  public Position: MyPosition = new MyPosition(-1, -1);

  constructor(
    private gridSetting: SettingsService,
    private gridData: DataService
  ) {}

  isPositionInSelection(pos: MyPosition): boolean {
    if (this.Position.isEqual(pos)) {
      return true;
    }

    if (this.PositionCollection.count() > 0) {
      for (let i = 0; i < this.PositionCollection.count(); i++) {
        if (this.PositionCollection.item(i).isEqual(pos)) {
          return true;
        }
      }
    }

    return false;
  }

  /* #region Clipboard */

  copy() {
    const copyEnabled: boolean =
      this.gridSetting.clipboardMode === ClipboardModeEnum.All ||
      this.gridSetting.clipboardMode === ClipboardModeEnum.Copy;

    if (!copyEnabled) {
      return;
    }

    if (this.PositionCollection.count() <= 1) {
      if (!this.Position.isEmpty()) {
        const data: string = this.gridData.getItemMainText(
          this.Position.row,
          this.Position.column
        );
        this.setClipboardData(data);
      }
    } else {
      const minCol: number = this.PositionCollection.minColumn();
      const maxCol: number = this.PositionCollection.maxColumn();
      const minRow: number = this.PositionCollection.minRow();
      const maxRow: number = this.PositionCollection.maxRow();
      const data: string = this.dataToStringArray(
        minRow,
        minCol,
        maxRow,
        maxCol
      );
      this.setClipboardData(data);
    }
  }

  paste() {}

  cut() {}

  private setClipboardData(data: string): void {
    const listener = (e: ClipboardEvent) => {
      const clipboard = e.clipboardData;
      if (clipboard) {
        clipboard.setData('text', data.toString());
      }
      e.preventDefault();
    };

    document.addEventListener('copy', listener, false);
    document.execCommand('copy');
    document.removeEventListener('copy', listener, false);
  }

  private dataToStringArray(
    minRow: number,
    minCol: number,
    maxRow: number,
    maxCol: number
  ): string {
    let dataString = '';

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.PositionCollection.contains(new MyPosition(row, col))) {
          dataString += this.gridData.getItemMainText(row, col);
          if (col < maxCol) {
            dataString += '\t';
          }
        } else {
          if (col < maxCol) {
            dataString += '\t';
          }
        }
      }
      dataString += '\r\n';
    }
    return dataString;
  }

  /* #endregion Clipboard */
}
