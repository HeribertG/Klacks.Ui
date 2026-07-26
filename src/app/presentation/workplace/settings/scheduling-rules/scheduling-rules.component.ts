// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing scheduling rules via a modal form.
 * Uses signalForm for scalar fields (name, numeric limits, rates) and
 * ngModel for boolean day-of-week checkboxes.
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
import { FormsModule } from '@angular/forms';
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

interface SchedulingRuleFormModel {
  name: string;
  maxWorkDays: number;
  minRestDays: number;
  minPauseHours: number;
  maxOptimalGap: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  maxConsecutiveDays: number;
  defaultWorkingHours: number;
  overtimeThreshold: number;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTimeHours: number;
  vacationDaysPerYear: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
}

@Component({
  selector: 'app-scheduling-rules',
  templateUrl: './scheduling-rules.component.html',
  styleUrls: ['./scheduling-rules.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
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
    maxWorkDays: 0,
    minRestDays: 0,
    minPauseHours: 0,
    maxOptimalGap: 0,
    maxDailyHours: 0,
    maxWeeklyHours: 0,
    maxConsecutiveDays: 0,
    defaultWorkingHours: 0,
    overtimeThreshold: 0,
    guaranteedHours: 0,
    maximumHours: 0,
    minimumHours: 0,
    fullTimeHours: 0,
    vacationDaysPerYear: 0,
    nightRate: 0,
    holidayRate: 0,
    saRate: 0,
    soRate: 0,
  });

  ruleForm = form(this.formModel, f => {
    debounce(f.name, 300);
  });

  message = DomainMessages.DELETE_ENTRY;

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
      maxWorkDays: rule.maxWorkDays ?? 0,
      minRestDays: rule.minRestDays ?? 0,
      minPauseHours: rule.minPauseHours ?? 0,
      maxOptimalGap: rule.maxOptimalGap ?? 0,
      maxDailyHours: rule.maxDailyHours ?? 0,
      maxWeeklyHours: rule.maxWeeklyHours ?? 0,
      maxConsecutiveDays: rule.maxConsecutiveDays ?? 0,
      defaultWorkingHours: rule.defaultWorkingHours ?? 0,
      overtimeThreshold: rule.overtimeThreshold ?? 0,
      guaranteedHours: rule.guaranteedHours ?? 0,
      maximumHours: rule.maximumHours ?? 0,
      minimumHours: rule.minimumHours ?? 0,
      fullTimeHours: rule.fullTimeHours ?? 0,
      vacationDaysPerYear: rule.vacationDaysPerYear ?? 0,
      nightRate: rule.nightRate ?? 0,
      holidayRate: rule.holidayRate ?? 0,
      saRate: rule.saRate ?? 0,
      soRate: rule.soRate ?? 0,
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
    this.editingRule.saRate = formData.saRate;
    this.editingRule.soRate = formData.soRate;
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
