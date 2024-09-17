import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GridSettingsService {
  weekday = new Array(7);
  monthsName = new Array(12);
  constructor() {
    this.weekday[0] = 'So';
    this.weekday[1] = 'Mo';
    this.weekday[2] = 'Di';
    this.weekday[3] = 'Mi';
    this.weekday[4] = 'Do';
    this.weekday[5] = 'Fr';
    this.weekday[6] = 'Sa';

    this.monthsName[0] = 'Januar';
    this.monthsName[1] = 'Februar';
    this.monthsName[2] = 'März';
    this.monthsName[3] = 'April';
    this.monthsName[4] = 'Mai';
    this.monthsName[5] = 'Juni';
    this.monthsName[6] = 'Juli';
    this.monthsName[7] = 'August';
    this.monthsName[8] = 'September';
    this.monthsName[9] = 'Oktober';
    this.monthsName[10] = 'November';
    this.monthsName[11] = 'Dezember';
  }

  destroy(): void {
    this.monthsName = [];
    this.weekday = [];
  }
}
