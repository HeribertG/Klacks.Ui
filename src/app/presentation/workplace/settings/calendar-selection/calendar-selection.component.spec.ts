// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { CalendarSelectionComponent } from './calendar-selection.component';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection-class';
import {
  StateCountryToken,
} from 'src/app/domain/models/calendar/calendar-rule-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

function makeToken(
  country: string,
  state: string,
  stateName: string,
  countryName: string
): StateCountryToken {
  const token = new StateCountryToken();
  token.country = country;
  token.state = state;
  token.stateName = Object.assign(new MultiLanguage(), { en: stateName });
  token.countryName = Object.assign(new MultiLanguage(), { en: countryName });
  return token;
}

describe('CalendarSelectionComponent', () => {
  let component: CalendarSelectionComponent;
  let fixture: ComponentFixture<CalendarSelectionComponent>;
  let mockSelectionService: any;
  let mockRulesService: any;
  let mockToastService: any;
  let mockNgbModal: any;
  let mockModalService: ModalService;

  const seededSelection: ICalendarSelection = {
    id: 'seeded-1',
    name: 'Kanton Zürich',
    isSeeded: true,
    internal: undefined,
    selectedCalendars: [
      {
        id: 'sc-1',
        calendarSelection: undefined,
        country: 'CH',
        state: 'CH',
        officialOverride: null,
      },
      {
        id: 'sc-2',
        calendarSelection: undefined,
        country: 'CH',
        state: 'ZH',
        officialOverride: null,
      },
    ],
  };

  const customSelection: ICalendarSelection = {
    id: 'custom-1',
    name: 'My Custom Selection',
    isSeeded: false,
    internal: undefined,
    selectedCalendars: [
      {
        id: 'sc-3',
        calendarSelection: undefined,
        country: 'CH',
        state: 'BE',
        officialOverride: false,
      },
    ],
  };

  const usedSelection: ICalendarSelection = {
    id: 'used-1',
    name: 'Used By Contract',
    isSeeded: false,
    internal: undefined,
    selectedCalendars: [],
  };

  const tokens: StateCountryToken[] = [
    makeToken('CH', 'CH', 'Switzerland', 'Switzerland'),
    makeToken('CH', 'ZH', 'Zurich', 'Switzerland'),
    makeToken('CH', 'BE', 'Bern', 'Switzerland'),
    makeToken('DE', 'DE', 'Germany', 'Germany'),
    makeToken('DE', 'BY', 'Bavaria', 'Germany'),
  ];

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSelectionService = {
      readData: vi.fn().mockResolvedValue(undefined),
      getPersistedSelections: vi
        .fn()
        .mockReturnValue([seededSelection, customSelection, usedSelection]),
      createCalendarSelection: vi.fn().mockResolvedValue(customSelection),
      updateCalendarSelectionItem: vi.fn().mockResolvedValue(customSelection),
      removeCalendarSelection: vi.fn().mockResolvedValue(undefined),
      usedByContracts: signal<string[]>(['used-1']),
    };

    mockRulesService = {
      loadRuleTokens: vi.fn().mockResolvedValue(tokens),
    };

    mockToastService = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    mockNgbModal = {
      open: vi.fn(),
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue('Translated text'),
      get: vi.fn().mockReturnValue(of('Translated text')),
      currentLang: 'en',
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    await TestBed.configureTestingModule({
      imports: [CalendarSelectionComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementCalendarSelectionService,
          useValue: mockSelectionService,
        },
        {
          provide: DataManagementCalendarRulesService,
          useValue: mockRulesService,
        },
        { provide: ToastShowService, useValue: mockToastService },
        { provide: NgbModal, useValue: mockNgbModal },
        ModalService,
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockModalService = TestBed.inject(ModalService);

    fixture = TestBed.createComponent(CalendarSelectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load selections and rule tokens on init', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockSelectionService.readData).toHaveBeenCalled();
      expect(mockRulesService.loadRuleTokens).toHaveBeenCalled();
      expect(component.calendarSelections().length).toBe(3);
      expect(component.ruleTokens().length).toBe(tokens.length);
    });

    it('should show load error toast when loading fails', async () => {
      mockSelectionService.readData.mockRejectedValue(new Error('Load error'));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockToastService.showError).toHaveBeenCalledWith(
        'setting.calendar-selection.error.load'
      );
    });
  });

  describe('Filtering', () => {
    it('should filter selections by search term', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.onSearchChange('custom');

      expect(component.filteredSelections().length).toBe(1);
      expect(component.filteredSelections()[0].id).toBe('custom-1');
    });

    it('should return all selections for empty search term', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.onSearchChange('');

      expect(component.filteredSelections().length).toBe(3);
    });
  });

  describe('Delete protection', () => {
    it('should not allow deleting seeded selections', () => {
      expect(component.canDelete(seededSelection)).toBe(false);
      expect(component.deleteDisabledReasonKey(seededSelection)).toBe(
        'setting.calendar-selection.cannot-delete-seeded'
      );
    });

    it('should not allow deleting selections used by contracts', () => {
      expect(component.canDelete(usedSelection)).toBe(false);
      expect(component.deleteDisabledReasonKey(usedSelection)).toBe(
        'setting.calendar-selection.cannot-delete-used'
      );
    });

    it('should allow deleting unused custom selections', () => {
      expect(component.canDelete(customSelection)).toBe(true);
      expect(component.deleteDisabledReasonKey(customSelection)).toBe('');
    });

    it('should not open the delete modal for seeded selections', () => {
      component.openDeleteCalendarSelection(seededSelection);

      expect(mockModalService.Filing).toBe('');
    });

    it('should delete an unused selection after modal confirmation', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.openDeleteCalendarSelection(customSelection);
      expect(mockModalService.Filing).toBe('custom-1');

      mockModalService.result(ModalType.Delete);
      await fixture.whenStable();

      expect(mockSelectionService.removeCalendarSelection).toHaveBeenCalledWith(
        'custom-1'
      );
    });
  });

  describe('Token selection', () => {
    it('should list only national tokens as countries', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const countries = component.countries();

      expect(countries.length).toBe(2);
      expect(countries.every((x) => x.state === x.country)).toBe(true);
    });

    it('should list national token first for selected country', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.onCountryChange('CH');
      const states = component.statesForCountry();

      expect(states.length).toBe(3);
      expect(states[0].state).toBe('CH');
    });

    it('should toggle tokens on and off', () => {
      const token = tokens[1];

      component.toggleToken(token);
      expect(component.isTokenSelected(token)).toBe(true);

      component.toggleToken(token);
      expect(component.isTokenSelected(token)).toBe(false);
    });
  });

  describe('Modal editing', () => {
    it('should initialize an empty selection on add', async () => {
      vi.useFakeTimers();
      fixture.detectChanges();

      component.onClickAdd();
      vi.advanceTimersByTime(10);

      expect(component.isNewSelection).toBe(true);
      expect(component.editingSelection).toBeTruthy();
      expect(component.selectedTokens().length).toBe(0);
      vi.useRealTimers();
    });

    it('should initialize form and tokens on edit', () => {
      vi.useFakeTimers();
      component.onClickEdit(seededSelection);
      vi.advanceTimersByTime(10);

      expect(component.isNewSelection).toBe(false);
      expect(component.selectedTokens().length).toBe(2);
      expect(component.selectedCountry()).toBe('CH');
      vi.useRealTimers();
    });

    it('should be invalid without name or without tokens', () => {
      component.onClickEdit(customSelection);

      expect(component.isFormValid()).toBe(true);

      component.selectedTokens.set([]);
      expect(component.isFormValid()).toBe(false);
    });

    it('should create a new selection on save', async () => {
      component.onClickAdd();
      component.calendarSelectionForm.name().value.set('New Selection');
      component.toggleToken(tokens[0]);

      const modal = { close: vi.fn() };
      await component.onSaveModal(modal);

      expect(
        mockSelectionService.createCalendarSelection
      ).toHaveBeenCalled();
      expect(modal.close).toHaveBeenCalled();
    });

    it('should update an existing selection on save', async () => {
      component.onClickEdit(customSelection);

      const modal = { close: vi.fn() };
      await component.onSaveModal(modal);

      expect(
        mockSelectionService.updateCalendarSelectionItem
      ).toHaveBeenCalled();
      expect(modal.close).toHaveBeenCalled();
    });

    it('should preserve id and officialOverride through an edit round-trip', async () => {
      component.onClickEdit(customSelection);

      const modal = { close: vi.fn() };
      await component.onSaveModal(modal);

      const saved = mockSelectionService.updateCalendarSelectionItem.mock
        .calls[0][0] as ICalendarSelection;
      expect(saved.selectedCalendars.length).toBe(1);
      expect(saved.selectedCalendars[0].id).toBe('sc-3');
      expect(saved.selectedCalendars[0].officialOverride).toBe(false);
    });

    it('should toggle reminder-only override and emit a new token array', () => {
      component.onClickEdit(customSelection);
      const before = component.selectedTokens();

      component.setTokenReminderOnly(before[0], true);
      const afterOn = component.selectedTokens();
      expect(afterOn).not.toBe(before);
      expect(afterOn[0].officialOverride).toBe(false);
      expect(component.isTokenReminderOnly(afterOn[0])).toBe(true);

      component.setTokenReminderOnly(afterOn[0], false);
      expect(component.selectedTokens()[0].officialOverride).toBeNull();
      expect(component.isTokenReminderOnly(component.selectedTokens()[0])).toBe(
        false
      );
    });

    it('should show error toast and keep modal open when save fails', async () => {
      mockSelectionService.updateCalendarSelectionItem.mockRejectedValue(
        new Error('Save error')
      );
      component.onClickEdit(customSelection);

      const modal = { close: vi.fn() };
      await component.onSaveModal(modal);

      expect(mockToastService.showError).toHaveBeenCalledWith(
        'setting.calendar-selection.error.save'
      );
      expect(modal.close).not.toHaveBeenCalled();
    });
  });
});
