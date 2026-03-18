// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared service for managing checkbox selection state in list views.
 * @param checkedArray - Array of CheckBoxValue items tracking individual checkbox states
 * @param headerCheckBoxValue - Current state of the header (select-all) checkbox
 */
import { CheckBoxValue } from 'src/app/domain/models/client/client-class';

export class CheckboxStateService {
  public checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  public headerCheckBoxValue = false;

  clearCheckedArray(): void {
    this.checkedArray = new Array<CheckBoxValue>();
  }

  addCheckBoxValueToArray(value: CheckBoxValue): void {
    this.checkedArray.push(value);
  }

  findCheckBoxValue(key: string): CheckBoxValue | undefined {
    if (!this.checkedArray) {
      return undefined;
    }
    if (key === '') {
      return undefined;
    }

    return this.checkedArray.find((x) => x.id === key);
  }

  removeCheckBoxValueToArray(key: string): void {
    const index = this.checkedArray.findIndex((x) => x.id === key);
    this.checkedArray.splice(index, 1);
  }

  checkBoxIndeterminate(): boolean {
    if (this.headerCheckBoxValue === undefined) {
      this.headerCheckBoxValue = false;
    }
    if (this.headerCheckBoxValue === null) {
      this.headerCheckBoxValue = false;
    }

    if (this.headerCheckBoxValue === true) {
      const tmp = this.checkedArray.find((x) => x.checked === false);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }
    if (this.headerCheckBoxValue === false) {
      const tmp = this.checkedArray.find((x) => x.checked === true);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }

    return false;
  }
}
