import { Injectable } from '@angular/core';
import {
  NgbDateStruct,
  NgbDateParserFormatter,
} from '@ng-bootstrap/ng-bootstrap';
import { isNumeric } from './format-helper';

@Injectable()
export class NgbDateCustomParserFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    if (value) {
      const dateParts = value.trim().split('.');
      if (dateParts.length === 1 && isNumeric(dateParts[0])) {
        return { day: +dateParts[0], month: undefined, year: undefined };
      } else if (
        dateParts.length === 2 &&
        isNumeric(dateParts[0]) &&
        isNumeric(dateParts[1])
      ) {
        return { day: +dateParts[0], month: +dateParts[1], year: undefined };
      } else if (
        dateParts.length === 3 &&
        isNumeric(dateParts[0]) &&
        isNumeric(dateParts[1]) &&
        isNumeric(dateParts[2])
      ) {
        return {
          day: +dateParts[0],
          month: +dateParts[1],
          year: +dateParts[2],
        };
      }
    }
    return null;
  }

  format(date: NgbDateStruct): string {
    return date
      ? `${isNumeric(date.day) ? this.padNumber(date.day!) : ''}.${
          isNumeric(date.month) ? this.padNumber(date.month!) : ''
        }.${date.year}`
      : '';
  }
  private padNumber(value: number): string {
    if (value.toString().length === 1) {
      return '0' + value.toString();
    }
    return value.toString();
  }
}
