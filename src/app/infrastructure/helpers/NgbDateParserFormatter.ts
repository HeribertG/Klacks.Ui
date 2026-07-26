// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import {
  NgbDateStruct,
  NgbDateParserFormatter,
} from '@ng-bootstrap/ng-bootstrap';
import { isNumeric } from '../../shared/helpers/number.helper';
import { padZero } from '../../shared/helpers/string.helper';

@Injectable()
export class NgbDateCustomParserFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    if (value) {
      const dateParts = value.trim().split('.');
      if (dateParts.length === 1 && isNumeric(dateParts[0])) {
        return { day: +dateParts[0], month: 1, year: new Date().getFullYear() };
      } else if (
        dateParts.length === 2 &&
        isNumeric(dateParts[0]) &&
        isNumeric(dateParts[1])
      ) {
        return { day: +dateParts[0], month: +dateParts[1], year: new Date().getFullYear() };
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
      ? `${isNumeric(date.day) ? padZero(date.day!.toString(), 2) : ''}.${
          isNumeric(date.month) ? padZero(date.month!.toString(), 2) : ''
        }.${date.year}`
      : '';
  }
}
