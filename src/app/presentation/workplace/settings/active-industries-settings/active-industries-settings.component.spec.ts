// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ActiveIndustriesSettingsComponent } from './active-industries-settings.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementIndustryTemplateService } from 'src/app/domain/services/settings/data-management-industry-template.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ActiveIndustriesSettings, IActiveIndustriesSettings } from 'src/app/domain/models/settings/app-settings.model';
import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';

describe('ActiveIndustriesSettingsComponent', () => {
  let component: ActiveIndustriesSettingsComponent;
  let fixture: ComponentFixture<ActiveIndustriesSettingsComponent>;
  let activeIndustriesSignal: ReturnType<typeof signal<IActiveIndustriesSettings>>;
  let isResetSignal: ReturnType<typeof signal<boolean>>;
  let triggerSignal: ReturnType<typeof signal<number>>;
  let getIndustryTemplateSpy: ReturnType<typeof vi.fn>;
  let getCustomRulesSummarySpy: ReturnType<typeof vi.fn>;
  let asideShowSpy: ReturnType<typeof vi.fn>;
  let submitTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    activeIndustriesSignal = signal<IActiveIndustriesSettings>(new ActiveIndustriesSettings());
    isResetSignal = signal(false);
    triggerSignal = signal(0);
    getIndustryTemplateSpy = vi.fn();
    getCustomRulesSummarySpy = vi.fn().mockReturnValue(of({ customSchedulingRuleCount: 0 }));
    asideShowSpy = vi.fn();
    submitTextSpy = vi.fn().mockResolvedValue(undefined);

    const mockSettings = {
      isReset: isResetSignal,
      settingsChangeTrigger: triggerSignal,
      appSettings: { activeIndustriesSettings: activeIndustriesSignal },
    };

    const mockManualLoader = {
      loadManual: vi.fn().mockReturnValue(of('')),
    };

    const mockIndustryTemplateService = {
      getIndustryTemplate: getIndustryTemplateSpy,
      getCustomRulesSummary: getCustomRulesSummarySpy,
    };

    const mockAsideService = {
      show: asideShowSpy,
    };

    const mockConversationOrchestrator = {
      submitText: submitTextSpy,
    };

    await TestBed.configureTestingModule({
      imports: [ActiveIndustriesSettingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementSettingsService, useValue: mockSettings },
        { provide: ManualLoaderService, useValue: mockManualLoader },
        { provide: DataManagementIndustryTemplateService, useValue: mockIndustryTemplateService },
        { provide: AsideService, useValue: mockAsideService },
        { provide: ConversationOrchestratorService, useValue: mockConversationOrchestrator },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveIndustriesSettingsComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('preselects nothing and shows the banner when the setting is missing (default)', () => {
    fixture.detectChanges();
    expect(component.formModel()).toEqual({ selectedOption: '' });
    expect(component.showSelectionBanner()).toBe(true);
  });

  it('preselects the single stored industry slug', () => {
    activeIndustriesSignal.set({ activeIndustry: 'security' });
    fixture.detectChanges();
    expect(component.formModel()).toEqual({ selectedOption: 'security' });
    expect(component.showSelectionBanner()).toBe(false);
  });

  it('preselects the custom-planning-rule option', () => {
    activeIndustriesSignal.set({ activeIndustry: 'custom' });
    fixture.detectChanges();
    expect(component.formModel()).toEqual({ selectedOption: 'custom' });
    expect(component.showSelectionBanner()).toBe(false);
  });

  it('shows the banner and preselects nothing for a legacy multi-slug value, without rewriting it', () => {
    activeIndustriesSignal.set({ activeIndustry: 'homecare,security' });
    fixture.detectChanges();
    expect(component.formModel()).toEqual({ selectedOption: '' });
    expect(component.showSelectionBanner()).toBe(true);
    expect(activeIndustriesSignal().activeIndustry).toBe('homecare,security');
    expect(triggerSignal()).toBe(0);
    const banner = fixture.nativeElement.querySelector('#active-industries-selection-banner');
    expect(banner).toBeTruthy();
  });

  it('shows the banner and preselects nothing for an unknown single slug', () => {
    activeIndustriesSignal.set({ activeIndustry: 'not-a-real-industry' });
    fixture.detectChanges();
    expect(component.formModel()).toEqual({ selectedOption: '' });
    expect(component.showSelectionBanner()).toBe(true);
  });

  it('persists exactly one value once the user picks an option', () => {
    fixture.detectChanges();
    component.formModel.set({ selectedOption: 'logistics' });
    TestBed.tick();
    expect(activeIndustriesSignal().activeIndustry).toBe('logistics');
    expect(triggerSignal()).toBeGreaterThan(0);
  });

  it('does not persist while no option is selected', () => {
    fixture.detectChanges();
    const triggerBefore = triggerSignal();
    component.formModel.set({ selectedOption: '' });
    TestBed.tick();
    expect(triggerSignal()).toBe(triggerBefore);
  });

  it('lazily loads and caches the preview for an industry on first expand', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [{ name: 'Rule A', description: null }],
      qualifications: [],
    };
    getIndustryTemplateSpy.mockReturnValue(of(template));
    fixture.detectChanges();

    expect(component.previewState('homecare').status).toBe('idle');

    component.toggleIndustryPreview('homecare');
    expect(component.isIndustryExpanded('homecare')).toBe(true);
    expect(component.previewState('homecare').status).toBe('loaded');
    expect(component.previewState('homecare').data).toEqual(template);
    expect(getIndustryTemplateSpy).toHaveBeenCalledTimes(1);

    component.toggleIndustryPreview('homecare');
    component.toggleIndustryPreview('homecare');
    expect(getIndustryTemplateSpy).toHaveBeenCalledTimes(1);
  });

  it('renders scheduling rules with a null description as name-only, without a dangling dash', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [{ name: 'Max daily hours', description: null }],
      qualifications: [{ name: { en: 'First aid' }, description: { en: 'Basic first aid certificate.' } }],
    };
    getIndustryTemplateSpy.mockReturnValue(of(template));
    fixture.detectChanges();

    component.toggleIndustryPreview('homecare');
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#ai-homecare-preview-panel');
    const items = Array.from(panel.querySelectorAll('li')).map((li) => li.textContent?.trim());
    expect(items).toContain('Max daily hours');
    expect(items.some((text) => text?.includes('Max daily hours —'))).toBe(false);
    expect(items.some((text) => text?.includes('First aid — Basic first aid certificate.'))).toBe(true);
  });

  it('sets an error preview state when the template request fails', () => {
    getIndustryTemplateSpy.mockReturnValue(throwError(() => new Error('not found')));
    fixture.detectChanges();

    component.toggleIndustryPreview('security');
    expect(component.previewState('security').status).toBe('error');
  });

  it('hides the custom planning rule explanation and button while a real industry is selected', () => {
    activeIndustriesSignal.set({ activeIndustry: 'homecare' });
    fixture.detectChanges();

    expect(component.isCustomOptionSelected()).toBe(false);
    expect(fixture.nativeElement.querySelector('#active-industries-custom-panel')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn')).toBeFalsy();
  });

  it('hides the custom planning rule panel while nothing is selected yet', () => {
    fixture.detectChanges();

    expect(component.isCustomOptionSelected()).toBe(false);
    expect(fixture.nativeElement.querySelector('#active-industries-custom-panel')).toBeFalsy();
  });

  it('renders the custom planning rule option as an enabled, standard-styled button once selected', () => {
    activeIndustriesSignal.set({ activeIndustry: 'custom' });
    fixture.detectChanges();

    expect(component.isCustomOptionSelected()).toBe(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn');
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
    expect(component.customRuleChatAvailable).toBe(true);
    expect(button.classList.contains('btn')).toBe(true);
    expect(button.classList.contains('btn-primary')).toBe(true);
  });

  it('keeps each industry preview panel nested under its own option block, not a sibling one', () => {
    getIndustryTemplateSpy.mockReturnValue(of({ industry: 'healthcare', schedulingRules: [], qualifications: [] }));
    fixture.detectChanges();

    component.toggleIndustryPreview('healthcare');
    fixture.detectChanges();

    const homecareBlock: HTMLElement = fixture.nativeElement.querySelector('#active-industries-homecare-block');
    const healthcareBlock: HTMLElement = fixture.nativeElement.querySelector('#active-industries-healthcare-block');
    const panel = fixture.nativeElement.querySelector('#ai-healthcare-preview-panel');

    expect(panel).toBeTruthy();
    expect(homecareBlock.contains(panel)).toBe(false);
    expect(healthcareBlock.contains(panel)).toBe(true);
  });

  it('shows the industry option label key as a heading inside its own expanded preview panel', () => {
    getIndustryTemplateSpy.mockReturnValue(of({ industry: 'security', schedulingRules: [], qualifications: [] }));
    fixture.detectChanges();

    component.toggleIndustryPreview('security');
    fixture.detectChanges();

    const heading: HTMLElement = fixture.nativeElement.querySelector(
      '#ai-security-preview-panel .industry-preview-panel-heading',
    );
    expect(heading.textContent?.trim()).toBe('setting.activeIndustries.security');
  });

  it('toggles a rule detail panel and renders only the fields that arrived, grouped correctly', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [
        {
          name: 'DE Klinik Standard',
          description: null,
          defaultWorkingHours: 8.5,
          nightRate: 0.25,
          nightStart: '23:00:00',
          nightEnd: '06:00:00',
          overtimeBasis: 'Week',
          overtimeRateMode: 'Multiplier',
          overtimeTier1Rate: 0.25,
          vacationDaysPerYear: 25,
        },
      ],
      qualifications: [],
    };
    getIndustryTemplateSpy.mockReturnValue(of(template));
    fixture.detectChanges();

    component.toggleIndustryPreview('homecare');
    fixture.detectChanges();

    expect(component.isRuleExpanded('homecare', 'DE Klinik Standard')).toBe(false);
    expect(fixture.nativeElement.querySelector('.rule-detail-list')).toBeFalsy();

    component.toggleRuleDetails('homecare', 'DE Klinik Standard');
    fixture.detectChanges();

    expect(component.isRuleExpanded('homecare', 'DE Klinik Standard')).toBe(true);

    const groupHeadings = Array.from(
      fixture.nativeElement.querySelectorAll('.rule-detail-group h6'),
    ).map((h) => (h as HTMLElement).textContent?.trim());
    expect(groupHeadings).toEqual([
      'setting.activeIndustries.preview.rule.group.workingTime',
      'setting.activeIndustries.preview.rule.group.surcharges',
      'setting.activeIndustries.preview.rule.group.overtime',
      'setting.activeIndustries.preview.rule.group.contractLimits',
    ]);

    const detailItems = Array.from(
      fixture.nativeElement.querySelectorAll('.rule-detail-list li'),
    ).map((li) => (li as HTMLElement).textContent?.trim());

    expect(detailItems).toContain('setting.schedulingRule.defaultWorkingHours: 8.5');
    expect(detailItems).toContain('setting.schedulingRule.nightRate: +25 %');
    expect(detailItems).toContain('setting.surchargeMode.night-start: 23:00');
    expect(detailItems).toContain('setting.surchargeMode.night-end: 06:00');
    expect(detailItems).toContain('setting.overtime.basis.label: setting.overtime.basis.week');
    expect(detailItems).toContain('setting.overtime.rateMode.label: setting.surchargeMode.rateMode.multiplier');
    expect(detailItems).toContain('setting.overtime.tier1.rate: +25 %');
    expect(detailItems).toContain('setting.schedulingRule.vacationDaysPerYear: 25');
    expect(detailItems?.length).toBe(8);

    component.toggleRuleDetails('homecare', 'DE Klinik Standard');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rule-detail-list')).toBeFalsy();
  });

  it('formats an overtime tier rate as a plain amount when the rate mode is not Multiplier', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [
        {
          name: 'Fixed Rate Rule',
          description: null,
          overtimeRateMode: 'FixedPerHour',
          overtimeTier1Rate: 12.5,
        },
      ],
      qualifications: [],
    };
    getIndustryTemplateSpy.mockReturnValue(of(template));
    fixture.detectChanges();

    component.toggleIndustryPreview('homecare');
    fixture.detectChanges();
    component.toggleRuleDetails('homecare', 'Fixed Rate Rule');
    fixture.detectChanges();

    const detailItems = Array.from(
      fixture.nativeElement.querySelectorAll('.rule-detail-list li'),
    ).map((li) => (li as HTMLElement).textContent?.trim());

    expect(detailItems).toContain('setting.overtime.rateMode.label: setting.surchargeMode.rateMode.fixedperhour');
    expect(detailItems).toContain('setting.overtime.tier1.rate: 12.5');
  });

  it('shows a no-details hint when a rule has no detail fields yet', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [{ name: 'Legacy Rule', description: null }],
      qualifications: [],
    };
    getIndustryTemplateSpy.mockReturnValue(of(template));
    fixture.detectChanges();

    component.toggleIndustryPreview('homecare');
    fixture.detectChanges();
    component.toggleRuleDetails('homecare', 'Legacy Rule');
    fixture.detectChanges();

    const emptyHint = fixture.nativeElement.querySelector('.rule-detail-empty');
    expect(emptyHint).toBeTruthy();
  });

  it('opens the aside and starts the localized trigger message with Klacksy on click', () => {
    vi.useFakeTimers();
    try {
      activeIndustriesSignal.set({ activeIndustry: 'custom' });
      fixture.detectChanges();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn');

      button.click();

      expect(asideShowSpy).toHaveBeenCalledTimes(1);
      expect(submitTextSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);

      expect(submitTextSpy).toHaveBeenCalledWith('setting.activeIndustries.custom.assistantPrompt');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not check the custom rules gate when a persisted custom selection is merely loaded', () => {
    activeIndustriesSignal.set({ activeIndustry: 'custom' });
    fixture.detectChanges();

    expect(getCustomRulesSummarySpy).not.toHaveBeenCalled();
    expect(component.isCustomGateBlocked()).toBe(false);
    expect(fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#active-industries-custom-gate-warning')).toBeFalsy();
  });

  it('does not persist and shows the gate warning when the user selects custom and no custom scheduling rules exist yet', () => {
    getCustomRulesSummarySpy.mockReturnValue(of({ customSchedulingRuleCount: 0 }));
    fixture.detectChanges();

    const customRadio: HTMLInputElement = fixture.nativeElement.querySelector('#ai-custom');
    customRadio.click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(getCustomRulesSummarySpy).toHaveBeenCalledTimes(1);
    expect(activeIndustriesSignal().activeIndustry).toBe('');
    expect(triggerSignal()).toBe(0);
    expect(component.isCustomGateBlocked()).toBe(true);
    expect(fixture.nativeElement.querySelector('#active-industries-custom-gate-warning')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn')).toBeFalsy();
  });

  it('persists the custom selection once a positive custom scheduling rule count is confirmed', () => {
    getCustomRulesSummarySpy.mockReturnValue(of({ customSchedulingRuleCount: 2 }));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#ai-custom').click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(activeIndustriesSignal().activeIndustry).toBe('custom');
    expect(triggerSignal()).toBeGreaterThan(0);
    expect(component.isCustomGateBlocked()).toBe(false);
    expect(fixture.nativeElement.querySelector('#active-industries-custom-open-chat-btn')).toBeTruthy();
  });

  it('persists the custom selection when the user forces activation despite the gate warning', () => {
    getCustomRulesSummarySpy.mockReturnValue(of({ customSchedulingRuleCount: 0 }));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#ai-custom').click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    const forceBtn: HTMLButtonElement = fixture.nativeElement.querySelector('#active-industries-custom-gate-force-btn');
    expect(forceBtn).toBeTruthy();

    forceBtn.click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(activeIndustriesSignal().activeIndustry).toBe('custom');
    expect(triggerSignal()).toBeGreaterThan(0);
    expect(component.isCustomGateBlocked()).toBe(false);
  });

  it('treats an unexpected error from the custom rules summary check as zero custom rules and shows the gate warning', () => {
    getCustomRulesSummarySpy.mockReturnValue(throwError(() => new Error('network down')));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#ai-custom').click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(activeIndustriesSignal().activeIndustry).toBe('');
    expect(component.isCustomGateBlocked()).toBe(true);
  });

  it('leaves the previous value untouched when the user abandons custom for another option before the gate resolves', () => {
    getCustomRulesSummarySpy.mockReturnValue(of({ customSchedulingRuleCount: 0 }));
    activeIndustriesSignal.set({ activeIndustry: 'security' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#ai-custom').click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#ai-logistics').click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(activeIndustriesSignal().activeIndustry).toBe('logistics');
    expect(component.isCustomGateBlocked()).toBe(false);
  });

  it('preselects the matching native radio input and switches selection via a real click', () => {
    activeIndustriesSignal.set({ activeIndustry: 'security' });
    fixture.detectChanges();

    const securityRadio: HTMLInputElement = fixture.nativeElement.querySelector('#ai-security');
    const logisticsRadio: HTMLInputElement = fixture.nativeElement.querySelector('#ai-logistics');
    expect(securityRadio.checked).toBe(true);
    expect(logisticsRadio.checked).toBe(false);

    logisticsRadio.click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();

    expect(component.formModel().selectedOption).toBe('logistics');
    expect(logisticsRadio.checked).toBe(true);
    expect(securityRadio.checked).toBe(false);
    expect(activeIndustriesSignal().activeIndustry).toBe('logistics');
  });
});
