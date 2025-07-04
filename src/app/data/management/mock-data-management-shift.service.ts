import { Injectable } from '@angular/core';

import { TruncatedShift } from 'src/app/core/shift-data-class';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  OwnTime,
  Shift,
  ShiftStatus,
  ShiftType,
} from 'src/app/core/schedule-class';

@Injectable({
  providedIn: 'root',
})
export class MockDataManagementShiftService {
  public listWrapper: TruncatedShift = {
    shifts: this.buildMockShifts(),
    maxItems: 7,
    maxPages: 1,
    currentPage: 1,
    firstItemOnPage: 1,
  };

  private buildMockShifts(): Shift[] {
    const raw = [
      {
        id: '1',
        name: 'Normale Arbeitszeit',
        description: 'Standard Arbeitszeiten für die Woche',
        fromDate: '2025-01-01',
        untilDate: '2025-12-31',
        startShift: '08:00',
        endShift: '17:00',
        days: {
          Mon: true,
          Tue: true,
          Wed: true,
          Thu: true,
          Fri: true,
          Sat: false,
          Sun: false,
          Holiday: false,
        },
        workTime: 9 * 60,
      },
      {
        id: '2',
        name: 'Frühschicht',
        description: 'Frühe Schicht für Produktionsabteilung',
        fromDate: '2025-01-01',
        untilDate: '2025-06-30',
        startShift: '06:00',
        endShift: '14:00',
        days: {
          Mon: true,
          Tue: true,
          Wed: true,
          Thu: true,
          Fri: true,
          Sat: false,
          Sun: false,
          Holiday: false,
        },
        workTime: 8 * 60,
      },
      // … weitere Einträge analog
    ];

    return raw.map((d) => {
      const s = new Shift();
      s.id = d.id;
      s.name = d.name;
      s.description = d.description;
      s.status = ShiftStatus.Original;
      s.shiftType = ShiftType.IsTask;

      // Datum
      s.fromDate = new Date(d.fromDate);
      s.internalFromDate = this.toNgbDate(s.fromDate);
      if (d.untilDate) {
        s.untilDate = new Date(d.untilDate);
        s.internalUntilDate = this.toNgbDate(s.untilDate);
      }

      // Zeiten
      const [h1, m1] = d.startShift.split(':');
      s.internalStartShift = new OwnTime(h1, m1);
      s.startShift = d.startShift;
      const [h2, m2] = d.endShift.split(':');
      s.internalEndShift = new OwnTime(h2, m2);
      s.endShift = d.endShift;

      // Wochentage
      s.isMonday = d.days.Mon;
      s.isTuesday = d.days.Tue;
      s.isWednesday = d.days.Wed;
      s.isThursday = d.days.Thu;
      s.isFriday = d.days.Fri;
      s.isSaturday = d.days.Sat;
      s.isSunday = d.days.Sun;
      s.isHoliday = d.days.Holiday;

      // Arbeitszeit
      s.workTime = d.workTime;
      s.internalWorkTime = new OwnTime(
        String(Math.floor(d.workTime / 60)),
        String(d.workTime % 60)
      );

      return s;
    });
  }

  private toNgbDate(date: Date): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }
}
