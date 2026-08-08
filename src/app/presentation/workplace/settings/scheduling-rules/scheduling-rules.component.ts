// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing scheduling rules via a modal form.
 * Uses signalForm for scalar fields (name, numeric limits, rates) and tri-state
 * checkboxes for the nullable day-of-week and shift-work flags, where the
 * indeterminate state means "not prescribed by this rule - the contract decides".
 */
import {
  Component, ChangeDetectionStrategy,
  ElementRef,
  effect,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  viewChild,
  TemplateRef,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { form, FormField, debounce } from '@angular/forms/signals';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { SchedulingRuleHeaderComponent } from './scheduling-rule-header/scheduling-rule-header.component';
import { SchedulingRuleRowComponent } from './scheduling-rule-row/scheduling-rule-row.component';
import { DataManagementSchedulingRuleService } from 'src/app/domain/services/scheduling/data-management-scheduling-rule.service';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

type SchedulingRuleTriStateField =
  | 'workOnMonday'
  | 'workOnTuesday'
  | 'workOnWednesday'
  | 'workOnThursday'
  | 'workOnFriday'
  | 'workOnSaturday'
  | 'workOnSunday'
  | 'performsShiftWork';

interface WorkDayOption {
  readonly field: SchedulingRuleTriStateField;
  readonly labelKey: string;
}

interface SchedulingRuleFormModel {
  name: string;
  maxWorkDays: number | null;
  minRestDays: number | null;
  minPauseHours: number | null;
  maxOptimalGap: number | null;
  maxDailyHours: number | null;
  maxWeeklyHours: number | null;
  maxConsecutiveDays: number | null;
  defaultWorkingHours: number | null;
  overtimeThreshold: number | null;
  guaranteedHours: number | null;
  maximumHours: number | null;
  minimumHours: number | null;
  fullTimeHours: number | null;
  vacationDaysPerYear: number | null;
  nightRate: number | null;
  holidayRate: number | null;
  we1Rate: number | null;
  we2Rate: number | null;
  we3Rate: number | null;
  nightStart: string | null;
  nightEnd: string | null;
  workOnMonday: boolean | null;
  workOnTuesday: boolean | null;
  workOnWednesday: boolean | null;
  workOnThursday: boolean | null;
  workOnFriday: boolean | null;
  workOnSaturday: boolean | null;
  workOnSunday: boolean | null;
  performsShiftWork: boolean | null;
}

@Component({
  selector: 'app-scheduling-rules',
  templateUrl: './scheduling-rules.component.html',
  styleUrls: ['./scheduling-rules.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormField,
    NgbModule,
    SpinnerModule,
    SchedulingRuleHeaderComponent,
    SchedulingRuleRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingRulesComponent
  implements OnInit, AfterViewInit, OnDestroy, IRefreshable
{
  public readonly refreshableEntities = RefreshEntityTokens.SCHEDULING_RULE;
  readonly ruleModal = viewChild.required<TemplateRef<unknown>>('ruleModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  public translate = inject(TranslateService);
  public dataManagementService = inject(DataManagementSchedulingRuleService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private manualLoader = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;

  public editingRule: ISchedulingRule | null = null;
  public originalRule: ISchedulingRule | null = null;
  public isNewRule = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();
  tabId = signal<'form' | 'help'>('form');
  manualContent = signal('');

  private formModel = signal<SchedulingRuleFormModel>({
    name: '',
    maxWorkDays: null,
    minRestDays: null,
    minPauseHours: null,
    maxOptimalGap: null,
    maxDailyHours: null,
    maxWeeklyHours: null,
    maxConsecutiveDays: null,
    defaultWorkingHours: null,
    overtimeThreshold: null,
    guaranteedHours: null,
    maximumHours: null,
    minimumHours: null,
    fullTimeHours: null,
    vacationDaysPerYear: null,
    nightRate: null,
    holidayRate: null,
    we1Rate: null,
    we2Rate: null,
    we3Rate: null,
    nightStart: null,
    nightEnd: null,
    workOnMonday: null,
    workOnTuesday: null,
    workOnWednesday: null,
    workOnThursday: null,
    workOnFriday: null,
    workOnSaturday: null,
    workOnSunday: null,
    performsShiftWork: null,
  });

  ruleForm = form(this.formModel, f => {
    debounce(f.name, 300);
  });

  message = DomainMessages.DELETE_ENTRY;

  readonly workDayOptions: readonly WorkDayOption[] = [
    { field: 'workOnMonday', labelKey: 'settings.work.monday' },
    { field: 'workOnTuesday', labelKey: 'settings.work.tuesday' },
    { field: 'workOnWednesday', labelKey: 'settings.work.wednesday' },
    { field: 'workOnThursday', labelKey: 'settings.work.thursday' },
    { field: 'workOnFriday', labelKey: 'settings.work.friday' },
    { field: 'workOnSaturday', labelKey: 'settings.work.saturday' },
    { field: 'workOnSunday', labelKey: 'settings.work.sunday' },
  ];

  readonly shiftWorkField: SchedulingRuleTriStateField = 'performsShiftWork';

  private static readonly TRI_STATE_TOOLTIP_KEYS: Record<string, string> = {
    unset: 'setting.schedulingRule.triState-unset',
    enabled: 'setting.schedulingRule.triState-enabled',
    disabled: 'setting.schedulingRule.triState-disabled',
  };

  isTriStateChecked(field: SchedulingRuleTriStateField): boolean {
    return this.formModel()[field] === true;
  }

  isTriStateUnset(field: SchedulingRuleTriStateField): boolean {
    return this.formModel()[field] == null;
  }

  triStateTooltipKey(field: SchedulingRuleTriStateField): string {
    if (this.isTriStateUnset(field)) {
      return SchedulingRulesComponent.TRI_STATE_TOOLTIP_KEYS['unset'];
    }
    return this.isTriStateChecked(field)
      ? SchedulingRulesComponent.TRI_STATE_TOOLTIP_KEYS['enabled']
      : SchedulingRulesComponent.TRI_STATE_TOOLTIP_KEYS['disabled'];
  }

  cycleTriState(field: SchedulingRuleTriStateField, target?: EventTarget | null): void {
    if (!this.editingRule) {
      return;
    }

    const current = this.formModel()[field];
    const next = current == null ? true : current ? false : null;
    this.formModel.update(model => ({ ...model, [field]: next }));
    this.editingRule[field] = next;

    const checkbox = target as HTMLInputElement | null;
    if (!checkbox) {
      return;
    }

    const applyDomState = (): void => {
      checkbox.checked = next === true;
      checkbox.indeterminate = next == null;
    };

    applyDomState();
    queueMicrotask(applyDomState);
  }

  private isReadEffect = effect(() => {
    if (this.dataManagementService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    this.unregisterRefresh = this.refreshRegistry.register(this);
    try {
      await this.dataManagementService.init();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing scheduling rules:', error);
    }
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, 'schedulingRules')
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.deleteRule(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    void this.dataManagementService.readRules();
  }

  onClickAdd(): void {
    this.editingRule = this.dataManagementService.createRule();
    this.initFormSignals(this.editingRule);
    this.originalRule = null;
    this.isNewRule = true;
    this.openModal();
  }

  onClickEdit(rule: ISchedulingRule): void {
    const clonedRule = cloneObject<ISchedulingRule>(rule);
    this.editingRule = clonedRule;
    this.initFormSignals(clonedRule);
    this.originalRule = rule;
    this.isNewRule = false;
    this.openModal();
  }

  private initFormSignals(rule: ISchedulingRule): void {
    this.formModel.set({
      name: rule.name || '',
      maxWorkDays: rule.maxWorkDays,
      minRestDays: rule.minRestDays,
      minPauseHours: rule.minPauseHours,
      maxOptimalGap: rule.maxOptimalGap,
      maxDailyHours: rule.maxDailyHours,
      maxWeeklyHours: rule.maxWeeklyHours,
      maxConsecutiveDays: rule.maxConsecutiveDays,
      defaultWorkingHours: rule.defaultWorkingHours,
      overtimeThreshold: rule.overtimeThreshold,
      guaranteedHours: rule.guaranteedHours,
      maximumHours: rule.maximumHours,
      minimumHours: rule.minimumHours,
      fullTimeHours: rule.fullTimeHours,
      vacationDaysPerYear: rule.vacationDaysPerYear,
      nightRate: rule.nightRate,
      holidayRate: rule.holidayRate,
      we1Rate: rule.we1Rate,
      we2Rate: rule.we2Rate,
      we3Rate: rule.we3Rate,
      nightStart: rule.nightStart,
      nightEnd: rule.nightEnd,
      workOnMonday: rule.workOnMonday,
      workOnTuesday: rule.workOnTuesday,
      workOnWednesday: rule.workOnWednesday,
      workOnThursday: rule.workOnThursday,
      workOnFriday: rule.workOnFriday,
      workOnSaturday: rule.workOnSaturday,
      workOnSunday: rule.workOnSunday,
      performsShiftWork: rule.performsShiftWork,
    });
  }

  private applySignalsToRule(): void {
    if (!this.editingRule) return;
    const formData = this.formModel();
    this.editingRule.name = formData.name;
    this.editingRule.maxWorkDays = formData.maxWorkDays;
    this.editingRule.minRestDays = formData.minRestDays;
    this.editingRule.minPauseHours = formData.minPauseHours;
    this.editingRule.maxOptimalGap = formData.maxOptimalGap;
    this.editingRule.maxDailyHours = formData.maxDailyHours;
    this.editingRule.maxWeeklyHours = formData.maxWeeklyHours;
    this.editingRule.maxConsecutiveDays = formData.maxConsecutiveDays;
    this.editingRule.defaultWorkingHours = formData.defaultWorkingHours;
    this.editingRule.overtimeThreshold = formData.overtimeThreshold;
    this.editingRule.guaranteedHours = formData.guaranteedHours;
    this.editingRule.maximumHours = formData.maximumHours;
    this.editingRule.minimumHours = formData.minimumHours;
    this.editingRule.fullTimeHours = formData.fullTimeHours;
    this.editingRule.vacationDaysPerYear = formData.vacationDaysPerYear;
    this.editingRule.nightRate = formData.nightRate;
    this.editingRule.holidayRate = formData.holidayRate;
    this.editingRule.we1Rate = formData.we1Rate;
    this.editingRule.we2Rate = formData.we2Rate;
    this.editingRule.we3Rate = formData.we3Rate;
    this.editingRule.nightStart = formData.nightStart || null;
    this.editingRule.nightEnd = formData.nightEnd || null;
    this.editingRule.workOnMonday = formData.workOnMonday;
    this.editingRule.workOnTuesday = formData.workOnTuesday;
    this.editingRule.workOnWednesday = formData.workOnWednesday;
    this.editingRule.workOnThursday = formData.workOnThursday;
    this.editingRule.workOnFriday = formData.workOnFriday;
    this.editingRule.workOnSaturday = formData.workOnSaturday;
    this.editingRule.workOnSunday = formData.workOnSunday;
    this.editingRule.performsShiftWork = formData.performsShiftWork;
  }

  private openModal(): void {
    this.tabId.set('form');
    this.loadManual();

    setTimeout(() => {
      this.ngbModal.open(this.ruleModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  openDeleteRule(index: number): void {
    const rules = this.dataManagementService.rules;
    if (index >= 0 && index < rules.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'schedulingRules';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteRule(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const rules = this.dataManagementService.rules;

    if (index >= 0 && index < rules.length) {
      const rule = rules[index];

      if (rule) {
        try {
          if (rule.id) {
            await this.dataManagementService.deleteRule(rule.id);
          } else {
            rules.splice(index, 1);
          }
        } catch (error) {
          console.error('Error deleting scheduling rule:', error);
        }
      }
    }
  }

  async onSaveModal(modal: unknown): Promise<void> {
    await this.saveRule();
    (modal as { close: () => void }).close();
  }

  private async saveRule(): Promise<void> {
    if (!this.editingRule || this.isSaving) {
      return;
    }

    this.applySignalsToRule();

    if (!this.isFormValid()) {
      return;
    }

    this.isSaving = true;

    try {
      if (this.originalRule) {
        Object.assign(this.originalRule, this.editingRule);
        await this.dataManagementService.saveExistingRule(this.originalRule);
      } else {
        this.dataManagementService.rules.push(this.editingRule);
        await this.dataManagementService.saveExistingRule(this.editingRule);
        this.originalRule = this.editingRule;
        this.isNewRule = false;

        if (this.containerBox()?.nativeElement) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (this.containerBox()?.nativeElement) {
                this.containerBox()!.nativeElement.scrollTop =
                  this.containerBox()!.nativeElement.scrollHeight;
              }
            }, 100);
          });
        }
      }
    } catch (error) {
      console.error('Error saving scheduling rule:', error);

      try {
        await this.dataManagementService.readRules();
      } catch (reloadError) {
        console.error('Error reloading rules after save error:', reloadError);
      }
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    if (!this.editingRule) return false;
    this.applySignalsToRule();
    return (
      this.dataManagementService.validateRule(this.editingRule).length === 0
    );
  }

  getValidationErrors(): string[] {
    if (!this.editingRule) return [];
    this.applySignalsToRule();
    return this.dataManagementService.validateRule(this.editingRule);
  }

  loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader.loadManual('scheduling-rule-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
