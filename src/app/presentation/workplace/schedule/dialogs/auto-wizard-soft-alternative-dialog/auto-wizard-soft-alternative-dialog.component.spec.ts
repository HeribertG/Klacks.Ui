// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AutoWizardSoftAlternativeDialogComponent } from './auto-wizard-soft-alternative-dialog.component';
import { AutoWizardSoftAlternativeService } from '../../services/auto-wizard-soft-alternative.service';
import { AutoWizardSoftAlternativeOffer } from '../../services/auto-wizard-soft-alternative-offer.interface';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { SchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.model';
import { KeywordMode } from 'src/app/domain/models/schedule/keyword-mode.enum';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';

function summary(filled: number, brokenFree: number): ScenarioSummary {
  return {
    token: 't',
    fromDate: '2026-11-01',
    untilDate: '2026-11-30',
    agentCount: 3,
    workCount: filled,
    demandedSlots: 30,
    filledSlots: filled,
    openSlots: 30 - filled,
    shifts: [],
    openSlotReasons: [],
    keywordWishes: { brokenFree, brokenOnly: 0, brokenNo: 0, unfulfilled: 0, items: [] },
  };
}

const OFFER: AutoWizardSoftAlternativeOffer = {
  strictScenarioName: 'Auto Plan',
  strictSummary: summary(25, 0),
  alternative: {
    scenarioId: 'soft-1',
    scenarioToken: 'soft-token',
    scenarioName: 'Auto Plan (soft)',
    keywordMode: KeywordMode.Soft,
    additionalFilledSlots: 3,
    summary: summary(28, 2),
    brokenWishes: [
      { clientId: 'c-1', clientName: 'Anna Muster', date: '2026-11-02', keyword: 'Free', outcome: 'BrokenFree' },
      { clientId: 'c-2', clientName: 'Ben Beispiel', date: '2026-11-04', keyword: 'Free', outcome: 'BrokenFree' },
    ],
  },
  alternativeScenario: {
    groupId: null,
    periodFrom: '2026-11-01',
    periodUntil: '2026-11-30',
    scenarioId: 'soft-1',
    token: 'soft-token',
    name: 'Auto Plan (soft)',
  },
};

describe('AutoWizardSoftAlternativeDialogComponent', () => {
  const offer = signal<AutoWizardSoftAlternativeOffer | null>(null);
  let dismiss: ReturnType<typeof vi.fn>;
  let openAlternative: ReturnType<typeof vi.fn>;

  const modal = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);

  beforeEach(() => {
    offer.set(null);
    dismiss = vi.fn(() => offer.set(null));
    openAlternative = vi.fn(() => {
      offer.set(null);
      return Promise.resolve();
    });
    TestBed.configureTestingModule({
      imports: [AutoWizardSoftAlternativeDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AutoWizardSoftAlternativeService, useValue: { offer, dismiss, openAlternative } },
        {
          provide: AppSettingsManagementService,
          useValue: { schedulingDefaultSettings: signal(new SchedulingDefaultSettings()) },
        },
      ],
    });
    TestBed.createComponent(AutoWizardSoftAlternativeDialogComponent).detectChanges();
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
  });

  it('stays closed without an offer', () => {
    // Arrange / Act
    TestBed.tick();

    // Assert
    expect(modal('#soft-alternative-title')).toBeNull();
  });

  it('opens with both plans, the extra shifts and the wishes the alternative breaks', () => {
    // Arrange / Act
    offer.set(OFFER);
    TestBed.tick();

    // Assert
    expect(modal('#soft-alternative-title')).not.toBeNull();
    expect(modal('#soft-alternative-strict')?.textContent).toContain('Auto Plan');
    expect(modal('#soft-alternative-name')?.textContent).toContain('Auto Plan (soft)');
    expect(modal('#soft-alternative-additional')?.textContent).toContain('autoWizard.softAlternative.additionalSlots.other');
    expect(document.querySelectorAll('#soft-alternative-broken-wishes .keyword-wish-row')).toHaveLength(2);
  });

  it('uses the singular text for one more shift', () => {
    // Arrange / Act
    offer.set({ ...OFFER, alternative: { ...OFFER.alternative, additionalFilledSlots: 1 } });
    TestBed.tick();

    // Assert
    expect(modal('#soft-alternative-additional')?.textContent).toContain('autoWizard.softAlternative.additionalSlots.one');
  });

  it('opens the alternative on request', () => {
    // Arrange
    offer.set(OFFER);
    TestBed.tick();

    // Act
    modal('#soft-alternative-open-btn')?.click();
    TestBed.tick();

    // Assert
    expect(openAlternative).toHaveBeenCalledWith(OFFER);
  });

  it('drops the offer when the planner keeps the strict plan', () => {
    // Arrange
    offer.set(OFFER);
    TestBed.tick();

    // Act
    modal('#soft-alternative-keep-btn')?.click();
    TestBed.tick();

    // Assert
    expect(dismiss).toHaveBeenCalledWith(OFFER);
    expect(openAlternative).not.toHaveBeenCalled();
  });
});

describe('AutoWizardSoftAlternativeDialogComponent while the modal fades out', () => {
  const offer = signal<AutoWizardSoftAlternativeOffer | null>(null);
  const NEXT_OFFER: AutoWizardSoftAlternativeOffer = {
    ...OFFER,
    strictScenarioName: 'Auto Plan 2',
    alternativeScenario: { ...OFFER.alternativeScenario, groupId: 'g2' },
  };
  let hidden: Subject<void>[];
  let open: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let dismiss: ReturnType<typeof vi.fn>;
  let component: AutoWizardSoftAlternativeDialogComponent;

  beforeEach(() => {
    offer.set(null);
    hidden = [];
    close = vi.fn();
    open = vi.fn(() => {
      const modalHidden = new Subject<void>();
      hidden.push(modalHidden);
      return { close, hidden: modalHidden };
    });
    dismiss = vi.fn((dismissed: AutoWizardSoftAlternativeOffer) => {
      if (offer() === dismissed) {
        offer.set(null);
      }
    });
    TestBed.configureTestingModule({
      imports: [AutoWizardSoftAlternativeDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NgbModal, useValue: { open } },
        {
          provide: AutoWizardSoftAlternativeService,
          useValue: { offer, dismiss, openAlternative: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AutoWizardSoftAlternativeDialogComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    offer.set(OFFER);
    TestBed.tick();
  });

  it('keeps showing the closed offer until the modal is hidden', () => {
    // Arrange / Act
    component.onKeepStrict();
    TestBed.tick();

    // Assert
    expect(close).toHaveBeenCalledTimes(1);
    expect(offer()).toBeNull();
    expect(component.shownOffer()).toBe(OFFER);
  });

  it('shows an offer published during the fade-out once the modal is hidden', () => {
    // Arrange
    component.onKeepStrict();
    offer.set(NEXT_OFFER);
    TestBed.tick();
    expect(open).toHaveBeenCalledTimes(1);

    // Act
    hidden[0].next();
    TestBed.tick();

    // Assert
    expect(offer()).toBe(NEXT_OFFER);
    expect(open).toHaveBeenCalledTimes(2);
    expect(component.shownOffer()).toBe(NEXT_OFFER);
  });

  it('drops the shown offer when the modal is closed without a button', () => {
    // Arrange / Act
    hidden[0].next();
    TestBed.tick();

    // Assert
    expect(dismiss).toHaveBeenCalledWith(OFFER);
    expect(offer()).toBeNull();
    expect(component.shownOffer()).toBeNull();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
