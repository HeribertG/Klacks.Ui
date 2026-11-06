// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { KeywordWishReportComponent } from './keyword-wish-report.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { SchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.model';
import { KeywordWishes } from 'src/app/domain/models/schedule/keyword-wishes.interface';
import { KeywordWishRow } from 'src/app/domain/models/schedule/keyword-wish-row.interface';

describe('KeywordWishReportComponent', () => {
  const settings = Object.assign(new SchedulingDefaultSettings(), { commandKeywordFree: 'FREI' });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeywordWishReportComponent, TranslateModule.forRoot()],
      providers: [{ provide: AppSettingsManagementService, useValue: { schedulingDefaultSettings: signal(settings) } }],
    }).compileComponents();
  });

  function render(wishes: KeywordWishes | null, rows: KeywordWishRow[]): HTMLElement {
    const fixture = TestBed.createComponent(KeywordWishReportComponent);
    fixture.componentRef.setInput('wishes', wishes);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing when no wish is missed', () => {
    // Arrange
    const empty: KeywordWishes = { brokenFree: 0, brokenOnly: 0, brokenNo: 0, unfulfilled: 0, items: [] };

    // Act
    const element = render(empty, []);

    // Assert
    expect(element.querySelector('.keyword-wish-report')).toBeNull();
  });

  it('shows only the tiers with a count', () => {
    // Arrange
    const wishes: KeywordWishes = { brokenFree: 2, brokenOnly: 0, brokenNo: 1, unfulfilled: 0, items: [] };

    // Act
    const counts = Array.from(render(wishes, []).querySelectorAll('.keyword-wish-count')).map((c) => c.textContent?.trim());

    // Assert
    expect(counts).toEqual(['keywordWishes.count.brokenFree', 'keywordWishes.count.brokenNo']);
  });

  it('lists each wish with the employee, the configured keyword and the readable kind', () => {
    // Arrange
    const rows: KeywordWishRow[] = [
      { clientName: 'Anna Muster', date: '2026-11-02', keyword: 'Free', outcome: 'BrokenFree' },
    ];

    // Act
    const cells = Array.from(render(null, rows).querySelectorAll('.keyword-wish-row td')).map((c) => c.textContent?.trim());

    // Assert
    expect(cells[0]).toBe('Anna Muster');
    expect(cells[1]).toBeTruthy();
    expect(cells[2]).toBe('FREI');
    expect(cells[3]).toBe('keywordWishes.outcome.brokenFree');
  });
});
