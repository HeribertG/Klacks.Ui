import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CalendarUtilService {
  private readonly MS_IN_A_DAY = 24 * 60 * 60 * 1000;

  getISO8601WeekNumber(inputDate: Date): number {
    const date = new Date(inputDate);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const thursday = date.getTime();
    date.setMonth(0);
    date.setDate(1);
    const jan1st = date.getTime();
    const days = Math.round((thursday - jan1st) / this.MS_IN_A_DAY);
    return Math.floor(days / 7) + 1;
  }

  getWeekStartDate(year: number, weekNumber: number): Date {
    const jan1 = new Date(year, 0, 1);
    const jan1DayOfWeek = jan1.getDay() || 7;
    const daysToFirstMonday = jan1DayOfWeek <= 4 ? 1 - jan1DayOfWeek : 8 - jan1DayOfWeek;
    const firstMondayOfYear = new Date(year, 0, 1 + daysToFirstMonday);
    const weekStart = new Date(firstMondayOfYear);
    weekStart.setDate(firstMondayOfYear.getDate() + (weekNumber - 1) * 7);
    return weekStart;
  }

  getWeekEndDate(year: number, weekNumber: number): Date {
    const weekStart = this.getWeekStartDate(year, weekNumber);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  getBiweeklyStartDate(year: number, weekNumber: number): Date {
    const adjustedWeek = weekNumber % 2 === 0 ? weekNumber - 1 : weekNumber;
    return this.getWeekStartDate(year, adjustedWeek);
  }

  getBiweeklyEndDate(year: number, weekNumber: number): Date {
    const adjustedWeek = weekNumber % 2 === 0 ? weekNumber : weekNumber + 1;
    return this.getWeekEndDate(year, adjustedWeek);
  }

  getMonthStartDate(year: number, month: number): Date {
    return new Date(year, month - 1, 1);
  }

  getMonthEndDate(year: number, month: number): Date {
    return new Date(year, month, 0);
  }
}
