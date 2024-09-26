import { Injectable } from '@angular/core';
import { NgbDatepickerI18n, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { LocaleService } from './locale.service';

type SupportedLocales = 'en' | 'de' | 'fr' | 'it';

const I18N_VALUES: {
  [key in SupportedLocales]: { weekdays: string[]; months: string[] };
} = {
  en: {
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: [
      'Jan.',
      'Feb.',
      'Mar.',
      'Apr.',
      'May',
      'Jun.',
      'Jul.',
      'Aug.',
      'Sep.',
      'Oct.',
      'Nov.',
      'Dec.',
    ],
  },
  de: {
    weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    months: [
      'Jan.',
      'Feb.',
      'Mär.',
      'Apr.',
      'Mai',
      'Jun.',
      'Jul.',
      'Aug.',
      'Sep.',
      'Okt.',
      'Nov.',
      'Dez.',
    ],
  },
  fr: {
    weekdays: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
    months: [
      'Janv.',
      'Févr.',
      'Mars',
      'Avr.',
      'Mai',
      'Juin',
      'Juil.',
      'Août',
      'Sept.',
      'Oct.',
      'Nov.',
      'Déc.',
    ],
  },
  it: {
    weekdays: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'],
    months: [
      'Gen.',
      'Feb.',
      'Mar.',
      'Apr.',
      'Mag.',
      'Giu.',
      'Lug.',
      'Ago.',
      'Set.',
      'Ott.',
      'Nov.',
      'Dic.',
    ],
  },
};

@Injectable()
export class CustomDatepickerI18n extends NgbDatepickerI18n {
  constructor(private localeService: LocaleService) {
    super();
  }

  getWeekdayShortName(weekday: number): string {
    const locale = this.localeService.getLocale() as SupportedLocales;
    return I18N_VALUES[locale].weekdays[weekday - 1];
  }

  getMonthShortName(month: number): string {
    const locale = this.localeService.getLocale() as SupportedLocales;
    return I18N_VALUES[locale].months[month - 1];
  }

  getMonthFullName(month: number): string {
    // Wenn Sie die abgekürzten Monatsnamen verwenden möchten
    return this.getMonthShortName(month);
  }

  getDayAriaLabel(date: NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }

  getWeekdayLabel(weekday: number): string {
    return this.getWeekdayShortName(weekday);
  }
}
