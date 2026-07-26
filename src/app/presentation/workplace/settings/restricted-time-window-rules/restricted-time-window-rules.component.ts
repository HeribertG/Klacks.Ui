// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing restricted time window rules via a modal form.
 * Uses signalForm for the season boundaries, daily time window and the optional
 * group tag, and persists each change immediately (no save bar).
 */
import {
  Component,
  ChangeDetectionStrategy,
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
import { form, FormField } from '@angular/forms/signals';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

import { RestrictedTimeWindowRuleHeaderComponent } from './restricted-time-window-rule-header/restricted-time-window-rule-header.component';
import { RestrictedTimeWindowRuleRowComponent } from './restricted-time-window-rule-row/restricted-time-window-rule-row.component';
import { DataManagementRestrictedTimeWindowRuleService } from 'src/app/domain/services/scheduling/data-management-restricted-time-window-rule.service';
import { IRestrictedTimeWindowRule } from 'src/app/domain/models/scheduling/restricted-time-window-rule.model';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';

const COMPONENT_CONTEXT = 'restrictedTimeWindowRules';
const RESTRICTED_TIME_WINDOW_MANUAL_NAME = 'restricted-time-window-manual';

type PageTab = 'list' | 'manual';

interface RestrictedTimeWindowRuleFormModel {
  seasonFromMonth: number;
  seasonFromDay: number;
  seasonToMonth: number;
  seasonToDay: number;
  dailyStart: string;
  dailyEnd: string;
  appliesToGroupTag: string;
}

@Component({
  selector: 'app-restricted-time-window-rules',
  templateUrl: './restricted-time-window-rules.component.html',
  styleUrls: ['./restricted-time-window-rules.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormField,
    NgbModule,
    RestrictedTimeWindowRuleHeaderComponent,
    RestrictedTimeWindowRuleRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestrictedTimeWindowRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly ruleModal = viewChild.required<TemplateRef<unknown>>('ruleModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  public translate = inject(TranslateService);
  public dataManagementService = inject(
    DataManagementRestrictedTimeWindowRuleService
  );
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private manualLoaderService = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<PageTab>('list');
  readonly manualContent = signal<string>('');

  public editingRule: IRestrictedTimeWindowRule | null = null;
  public originalRule: IRestrictedTimeWindowRule | null = null;
  public isNewRule = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();

  private formModel = signal<RestrictedTimeWindowRuleFormModel>({
    seasonFromMonth: 1,
    seasonFromDay: 1,
    seasonToMonth: 12,
    seasonToDay: 31,
    dailyStart: '22:00',
    dailyEnd: '06:00',
    appliesToGroupTag: '',
  });

  ruleForm = form(this.formModel);

  private isReadEffect = effect(() => {
    if (this.dataManagementService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTab() === 'manual') {
          this.loadManual();
        }
      });

    try {
      await this.dataManagementService.init();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing restricted time window rules:', error);
    }
  }

  setTab(tab: PageTab): void {
    this.activeTab.set(tab);
    if (tab === 'manual' && !this.manualContent()) {
      this.loadManual();
    }
  }

  private loadManual(): void {
    const lang =
      this.translate.currentLang ||
      this.translate.defaultLang ||
      DomainMessages.DEFAULT_LANG;
    this.manualLoaderService
      .loadManual(RESTRICTED_TIME_WINDOW_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe((content) => this.manualContent.set(content));
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, COMPONENT_CONTEXT)
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.deleteRule(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingRule = this.dataManagementService.createRule();
    this.initFormSignals(this.editingRule);
    this.originalRule = null;
    this.isNewRule = true;
    this.openModal();
  }

  onClickEdit(rule: IRestrictedTimeWindowRule): void {
    const clonedRule = cloneObject<IRestrictedTimeWindowRule>(rule);
    this.editingRule = clonedRule;
    this.initFormSignals(clonedRule);
    this.originalRule = rule;
    this.isNewRule = false;
    this.openModal();
  }

  private initFormSignals(rule: IRestrictedTimeWindowRule): void {
    this.formModel.set({
      seasonFromMonth: rule.seasonFromMonth ?? 1,
      seasonFromDay: rule.seasonFromDay ?? 1,
      seasonToMonth: rule.seasonToMonth ?? 12,
      seasonToDay: rule.seasonToDay ?? 31,
      dailyStart: formatTime(rule.dailyStart) || '22:00',
      dailyEnd: formatTime(rule.dailyEnd) || '06:00',
      appliesToGroupTag: rule.appliesToGroupTag ?? '',
    });
  }

  private applySignalsToRule(): void {
    if (!this.editingRule) return;
    const formData = this.formModel();
    this.editingRule.seasonFromMonth = formData.seasonFromMonth;
    this.editingRule.seasonFromDay = formData.seasonFromDay;
    this.editingRule.seasonToMonth = formData.seasonToMonth;
    this.editingRule.seasonToDay = formData.seasonToDay;
    this.editingRule.dailyStart = formData.dailyStart;
    this.editingRule.dailyEnd = formData.dailyEnd;
    this.editingRule.appliesToGroupTag = formData.appliesToGroupTag;
  }

  private openModal(): void {
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
      this.modalService.componentContext = COMPONENT_CONTEXT;
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.translate.instant(
        'setting.restrictedTimeWindowRule.importDeleteWarning'
      );
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
          console.error('Error deleting restricted time window rule:', error);
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
      console.error('Error saving restricted time window rule:', error);

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
}
