// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientAvailabilityHeaderComponent } from './client-availability-header.component';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilityCalculationService } from '../services/render-availability-grid';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { ClientAvailabilityFilterService } from 'src/app/domain/services/client-availability/client-availability-filter.service';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';

const CALENDAR_WEEK_KEY = 'client-availability.calendar-week';
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => `month.${index + 1}`);
const WEEK = 7;
const BIWEEKLY_START_WEEK = 6;
const BIWEEKLY_END_WEEK = 7;
const MARCH = 3;

describe('ClientAvailabilityHeaderComponent period label', () => {
  let fixture: ComponentFixture<ClientAvailabilityHeaderComponent>;
  let component: ClientAvailabilityHeaderComponent;

  const createFor = (viewMode: PaymentInterval): void => {
    fixture = TestBed.createComponent(ClientAvailabilityHeaderComponent);
    fixture.componentRef.setInput('viewMode', viewMode);
    component = fixture.componentInstance;
    component.currentWeek = WEEK;
    component.currentMonth = MARCH;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClientAvailabilityHeaderComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { hourGroupingMode: signal(0) } },
        { provide: GridSettingsService, useValue: { monthsName: MONTH_NAMES } },
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
        {
          provide: CalendarUtilService,
          useValue: {
            getBiweeklyWeeks: () => ({ start: { week: BIWEEKLY_START_WEEK }, end: { week: BIWEEKLY_END_WEEK } }),
          },
        },
        { provide: AvailabilityCalculationService, useValue: {} },
        { provide: ClientAvailabilityFilterService, useValue: {} },
        { provide: QuickPrintActionService, useValue: { hasDefault: () => false } },
      ],
    });
    TestBed.overrideComponent(ClientAvailabilityHeaderComponent, { set: { template: '', imports: [] } });
  });

  it('returns the calendar-week key and the week number as suffix instead of translating itself', () => {
    createFor(PaymentInterval.Weekly);

    expect(component.displayPeriodKey).toBe(CALENDAR_WEEK_KEY);
    expect(component.displayPeriodSuffix).toBe(` ${WEEK}`);
  });

  it('returns the calendar-week key and the week range for a biweekly period', () => {
    createFor(PaymentInterval.Biweekly);

    expect(component.displayPeriodKey).toBe(CALENDAR_WEEK_KEY);
    expect(component.displayPeriodSuffix).toBe(` ${BIWEEKLY_START_WEEK}-${BIWEEKLY_END_WEEK}`);
  });

  it('returns the month entry and no suffix for a monthly period', () => {
    createFor(PaymentInterval.Monthly);

    expect(component.displayPeriodKey).toBe(MONTH_NAMES[MARCH - 1]);
    expect(component.displayPeriodSuffix).toBe('');
  });
});
