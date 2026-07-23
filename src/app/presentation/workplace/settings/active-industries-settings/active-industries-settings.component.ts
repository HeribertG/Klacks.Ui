// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the ACTIVE_INDUSTRIES setting: a single-choice radio group (one of the
 * five canonical industries, or a "custom planning rule" option) with a settings tab and a
 * help tab (localized manual). Only the selected industry's presets (scheduling rules,
 * qualifications) appear in selection lists; presets of the other industries are kept, never
 * deleted. Legacy multi-slug values from the earlier checkbox-based UI are surfaced as an
 * info banner instead of being silently rewritten, and only replaced once the user picks a
 * single option explicitly.
 * @param formModel - Local signal holding the single selected option (one industry slug or
 * the custom-planning-rule sentinel, or the empty-string "nothing selected yet" sentinel),
 * loaded from and synced back to the shared app settings store. Typed as plain `string`
 * (not `string | null`) because Signal Forms requires a native radio's bound field to match
 * the control's native value type exactly.
 * @param showSelectionBanner - True while no single option is resolved (legacy multi-value
 * or an empty/unset setting); blocks syncing until the user picks explicitly.
 * @param isCustomOptionSelected - True only while the custom-planning-rule radio is the
 * selected option; gates visibility of its explanatory text and the Klacksy button, which
 * must never show while a real industry option is selected.
 * @param customRuleChatAvailable - True: opening Klacksy and starting a message is wired via
 * the existing app-wide ConversationOrchestratorService.submitText() (already used the same
 * way by voice-shell-input.component.ts) plus AsideService.show(). AssistantChatComponent
 * itself is NOT touched. Because AssistantChatComponent (and therefore the orchestrator's
 * callbacks) is only mounted once the aside becomes visible, submitText() is deferred one
 * macrotask via setTimeout(0) after show() — the same established mount-timing workaround
 * already used elsewhere in this project for viewChild.required timing.
 * @param activeTab - Currently visible card tab ('settings' form or 'manual' help).
 * @param manualContent - Localized help HTML rendered in the manual tab.
 * @param currentLang - Current UI language, used to resolve the MultiLanguage
 * name/description fields on qualification preview entries via the fallback pipe, and to
 * translate the overtime-basis and overtime-rate-mode labels in a rule's expanded detail
 * groups.
 * @param isCustomGateBlocked - True while the user just picked the custom-planning-rule
 * option but the backend reports zero customer-owned scheduling rules: the selection is
 * shown but deliberately NOT persisted until the user either sets up a rule with Klacksy or
 * explicitly forces activation, since persisting it with nothing behind it would hide every
 * industry preset and leave all selection lists empty without warning.
 */

import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementIndustryTemplateService } from 'src/app/domain/services/settings/data-management-industry-template.service';
import { IndustrySlugs } from 'src/app/domain/constants/industry-slugs.constants';
import { CUSTOM_PLANNING_RULE_SLUG } from 'src/app/domain/constants/custom-planning-rule.constants';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';
import { IIndustryTemplateSchedulingRuleEntry } from 'src/app/domain/models/settings/industry-template-scheduling-rule-entry.interface';
import { IIndustryTemplateRuleDetailGroup } from 'src/app/domain/models/settings/industry-template-rule-detail-group.interface';
import { buildSchedulingRuleDetailGroups } from 'src/app/domain/helpers/industry-template-rule-detail.helper';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';

const ACTIVE_INDUSTRIES_MANUAL_NAME = 'active-industries-manual';
const NO_PROFILE_SELECTED = '';
const CUSTOM_PLANNING_RULE_ASSISTANT_PROMPT_KEY = 'setting.activeIndustries.custom.assistantPrompt';
const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;
const NO_CUSTOM_SCHEDULING_RULES = 0;
const RULE_KEY_SEPARATOR = '::';
const OVERTIME_BASIS_WEEK = 'Week';
const OVERTIME_RATE_MODE_LABEL_KEYS: Record<string, string> = {
  Multiplier: 'setting.surchargeMode.rateMode.multiplier',
  FixedPerHour: 'setting.surchargeMode.rateMode.fixedperhour',
  FixedPerShift: 'setting.surchargeMode.rateMode.fixedpershift',
};

interface ActiveIndustriesFormModel {
  selectedOption: string;
}

interface IndustryOption {
  slug: string;
  labelKey: string;
}

type IndustryPreviewStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface IndustryPreviewState {
  status: IndustryPreviewStatus;
  data?: IIndustryTemplate;
}

type CustomGateStatus = 'idle' | 'blocked';

const INDUSTRY_OPTIONS: IndustryOption[] = [
  { slug: IndustrySlugs.Homecare, labelKey: 'setting.activeIndustries.homecare' },
  { slug: IndustrySlugs.Healthcare, labelKey: 'setting.activeIndustries.healthcare' },
  { slug: IndustrySlugs.Security, labelKey: 'setting.activeIndustries.security' },
  { slug: IndustrySlugs.Facility, labelKey: 'setting.activeIndustries.facility' },
  { slug: IndustrySlugs.Logistics, labelKey: 'setting.activeIndustries.logistics' },
];

const KNOWN_OPTION_SLUGS = new Set<string>([
  ...INDUSTRY_OPTIONS.map((option) => option.slug),
  CUSTOM_PLANNING_RULE_SLUG,
]);

const IDLE_PREVIEW_STATE: IndustryPreviewState = { status: 'idle' };

@Component({
  selector: 'app-active-industries-settings',
  templateUrl: './active-industries-settings.component.html',
  styleUrls: ['./active-industries-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule, IconAngleDownComponent, IconAngleRightComponent, FallbackPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveIndustriesSettingsComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private industryTemplateService = inject(DataManagementIndustryTemplateService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private destroyRef = inject(DestroyRef);
  private asideService = inject(AsideService);
  private conversationOrchestrator = inject(ConversationOrchestratorService);

  public isDataLoaded = signal(false);

  public activeTab = signal<'settings' | 'manual'>('settings');
  public manualContent = signal('');
  public currentLang = DomainMessages.DEFAULT_LANG;

  public readonly industryOptions = INDUSTRY_OPTIONS;
  public readonly customOptionSlug = CUSTOM_PLANNING_RULE_SLUG;
  public readonly customRuleChatAvailable = true;

  public formModel = signal<ActiveIndustriesFormModel>({ selectedOption: NO_PROFILE_SELECTED });

  industriesForm = form(this.formModel);

  public showSelectionBanner = computed(() => this.formModel().selectedOption === NO_PROFILE_SELECTED);
  public isCustomOptionSelected = computed(() => this.formModel().selectedOption === CUSTOM_PLANNING_RULE_SLUG);

  private expandedSlugs = signal<ReadonlySet<string>>(new Set());
  private previewStates = signal<Record<string, IndustryPreviewState>>({});
  private expandedRuleKeys = signal<ReadonlySet<string>>(new Set());

  private customGateStatus = signal<CustomGateStatus>('idle');
  public isCustomGateBlocked = computed(() => this.customGateStatus() === 'blocked');

  private previousSelectedOption = NO_PROFILE_SELECTED;

  constructor() {
    effect(() => {
      const isReset = this.dataManagementSettingsService.isReset();
      untracked(() => {
        if (isReset && !this.isDataLoaded()) {
          this.loadFromService();
          this.isDataLoaded.set(true);
        }
      });
    });

    effect(() => {
      const data = this.formModel();
      untracked(() => {
        if (this.isDataLoaded()) {
          this.handleSelectionChange(data);
        }
      });
    });
  }

  ngOnInit(): void {
    if (!this.isDataLoaded()) {
      this.loadFromService();
      this.isDataLoaded.set(true);
    }

    this.currentLang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
        this.loadManual();
      });
  }

  openKlacksyForCustomPlanningRule(): void {
    this.asideService.show();
    const prompt = this.translate.instant(CUSTOM_PLANNING_RULE_ASSISTANT_PROMPT_KEY);
    setTimeout(() => {
      void this.conversationOrchestrator.submitText(prompt);
    }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
  }

  forceActivateCustomPlanningRule(): void {
    this.customGateStatus.set('idle');
    this.syncToService(this.formModel());
  }

  isIndustryExpanded(slug: string): boolean {
    return this.expandedSlugs().has(slug);
  }

  previewState(slug: string): IndustryPreviewState {
    return this.previewStates()[slug] ?? IDLE_PREVIEW_STATE;
  }

  toggleIndustryPreview(slug: string): void {
    const expanded = new Set(this.expandedSlugs());
    if (expanded.has(slug)) {
      expanded.delete(slug);
    } else {
      expanded.add(slug);
      this.ensurePreviewLoaded(slug);
    }
    this.expandedSlugs.set(expanded);
  }

  isRuleExpanded(industrySlug: string, ruleName: string): boolean {
    return this.expandedRuleKeys().has(this.ruleKey(industrySlug, ruleName));
  }

  toggleRuleDetails(industrySlug: string, ruleName: string): void {
    const key = this.ruleKey(industrySlug, ruleName);
    const expanded = new Set(this.expandedRuleKeys());
    if (expanded.has(key)) {
      expanded.delete(key);
    } else {
      expanded.add(key);
    }
    this.expandedRuleKeys.set(expanded);
  }

  ruleDetailGroups(rule: IIndustryTemplateSchedulingRuleEntry): IIndustryTemplateRuleDetailGroup[] {
    const overtimeBasisLabel = rule.overtimeBasis
      ? this.translate.instant(
        rule.overtimeBasis === OVERTIME_BASIS_WEEK ? 'setting.overtime.basis.week' : 'setting.overtime.basis.day',
      )
      : null;

    const overtimeRateModeKey = rule.overtimeRateMode ? OVERTIME_RATE_MODE_LABEL_KEYS[rule.overtimeRateMode] : undefined;
    const overtimeRateModeLabel = overtimeRateModeKey ? this.translate.instant(overtimeRateModeKey) : null;

    return buildSchedulingRuleDetailGroups(rule, { overtimeBasisLabel, overtimeRateModeLabel });
  }

  private ruleKey(industrySlug: string, ruleName: string): string {
    return `${industrySlug}${RULE_KEY_SEPARATOR}${ruleName}`;
  }

  private ensurePreviewLoaded(slug: string): void {
    if (this.previewState(slug).status !== 'idle') {
      return;
    }

    this.previewStates.update((states) => ({ ...states, [slug]: { status: 'loading' } }));
    this.industryTemplateService
      .getIndustryTemplate(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.previewStates.update((states) => ({ ...states, [slug]: { status: 'loaded', data } })),
        error: () => this.previewStates.update((states) => ({ ...states, [slug]: { status: 'error' } })),
      });
  }

  private loadManual(): void {
    this.manualLoader.loadManual(ACTIVE_INDUSTRIES_MANUAL_NAME, this.currentLang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const raw = svc.appSettings.activeIndustriesSettings().activeIndustry;
    const resolved = this.resolveSingleOption(raw);
    this.previousSelectedOption = resolved;
    this.customGateStatus.set('idle');
    this.formModel.set({ selectedOption: resolved });
  }

  private handleSelectionChange(data: ActiveIndustriesFormModel): void {
    const previousSelectedOption = this.previousSelectedOption;
    const selectedOption = data.selectedOption;
    this.previousSelectedOption = selectedOption;

    if (selectedOption !== CUSTOM_PLANNING_RULE_SLUG) {
      this.customGateStatus.set('idle');
      this.syncToService(data);
      return;
    }

    if (previousSelectedOption === CUSTOM_PLANNING_RULE_SLUG) {
      return;
    }

    this.runCustomRulesGateCheck();
  }

  private runCustomRulesGateCheck(): void {
    this.industryTemplateService
      .getCustomRulesSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.resolveCustomGateCheck(summary.customSchedulingRuleCount),
        error: () => this.resolveCustomGateCheck(NO_CUSTOM_SCHEDULING_RULES),
      });
  }

  private resolveCustomGateCheck(customSchedulingRuleCount: number): void {
    if (this.formModel().selectedOption !== CUSTOM_PLANNING_RULE_SLUG) {
      this.customGateStatus.set('idle');
      return;
    }

    if (customSchedulingRuleCount > NO_CUSTOM_SCHEDULING_RULES) {
      this.customGateStatus.set('idle');
      this.syncToService(this.formModel());
      return;
    }

    this.customGateStatus.set('blocked');
  }

  private resolveSingleOption(raw: string): string {
    const tokens = (raw ?? '')
      .split(IndustrySlugs.Separator)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length !== 1) {
      return NO_PROFILE_SELECTED;
    }

    return KNOWN_OPTION_SLUGS.has(tokens[0]) ? tokens[0] : NO_PROFILE_SELECTED;
  }

  private syncToService(data: ActiveIndustriesFormModel): void {
    const selectedOption = data.selectedOption;
    if (selectedOption === NO_PROFILE_SELECTED) {
      return;
    }

    const svc = this.dataManagementSettingsService;
    svc.appSettings.activeIndustriesSettings.update((s) => ({
      ...s,
      activeIndustry: selectedOption,
    }));
    svc.settingsChangeTrigger.update((v) => v + 1);
  }
}
