// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import {
  MyPosition,
  MyPositionCollection,
} from 'src/app/presentation/shared/grid/classes/position';

import { ClipboardModeEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';

export interface HoveredCellInfo {
  row: number;
  column: number;
  isEmpty: boolean;
  isHeader: boolean;
  clientX: number;
  clientY: number;
}

@Injectable()
export class BaseCellManipulationService {
  protected gridSetting = inject(BaseSettingsService);
  protected gridData = inject(BaseDataService);

  public PositionCollection = new MyPositionCollection();

  private _position: MyPosition = new MyPosition(-1, -1);
  private _hasClipboardData = false;
  public positionSignal = signal<MyPosition>(this._position);
  public hoveredCell = signal<HoveredCellInfo | null>(null);
  public isEditing = signal<boolean>(false);
  public initialEditChar = signal<string>('');

  public get Position(): MyPosition {
    return this._position;
  }

  public set Position(value: MyPosition) {
    this._position = value;
    this.isEditing.set(false);
    this.initialEditChar.set('');
    this.positionSignal.set(value);
  }

  public startEditing(initialChar = ''): void {
    this.initialEditChar.set(initialChar);
    this.isEditing.set(true);
  }

  public stopEditing(): void {
    this.isEditing.set(false);
    this.initialEditChar.set('');
  }

  public hasClipboardData(): boolean {
    return this._hasClipboardData;
  }

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
        this.gridData.onCopy(
          this.Position.row,
          this.Position.column,
          this.Position.row,
          this.Position.column
        );
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
      this.gridData.onCopy(minRow, minCol, maxRow, maxCol);
    }
  }

  async paste(): Promise<void> {
    const pasteEnabled: boolean =
      this.gridSetting.clipboardMode === ClipboardModeEnum.All ||
      this.gridSetting.clipboardMode === ClipboardModeEnum.Paste;

    if (!pasteEnabled) {
      return;
    }

    if (this.Position.isEmpty()) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText || clipboardText.trim() === '') {
        return;
      }

      const pasteData = this.parseClipboardData(clipboardText);
      if (pasteData.length === 0) {
        return;
      }

      const isSingleValue = pasteData.length === 1 && pasteData[0].length === 1;
      const hasMultiSelect = this.PositionCollection.count() > 1;

      if (isSingleValue && hasMultiSelect) {
        for (let i = 0; i < this.PositionCollection.count(); i++) {
          const pos = this.PositionCollection.item(i);
          this.gridData.handlePaste(pos.row, pos.column, pasteData);
        }
      } else {
        this.gridData.handlePaste(
          this.Position.row,
          this.Position.column,
          pasteData
        );
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }

  private parseClipboardData(text: string): string[][] {
    const rows = text.split(/\r?\n/).filter((row) => row.length > 0);
    return rows.map((row) => row.split('\t'));
  }

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
    this._hasClipboardData = data.length > 0;
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
