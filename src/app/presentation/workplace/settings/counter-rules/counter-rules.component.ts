// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing counter rules via a modal form.
 * Orchestrates add/edit/delete against DataManagementCounterRuleService with
 * immediate persistence; enum fields bind through ngModel + [ngValue] so the
 * numeric enum type is preserved on the wire.
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
  ChangeDetectorRef,
  signal,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { CounterRuleHeaderComponent } from './counter-rule-header/counter-rule-header.component';
import { CounterRuleRowComponent } from './counter-rule-row/counter-rule-row.component';
import { DataManagementCounterRuleService } from 'src/app/domain/services/scheduling/data-management-counter-rule.service';
import { ICounterRule } from 'src/app/domain/models/scheduling/counter-rule.model';
import {
  CounterEventType,
  CounterPeriod,
  RuleEnforcementMode,
} from 'src/app/domain/enums/counter-rule.enums';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';

const COUNTER_RULE_MANUAL_NAME = 'counter-rule-manual';

type PageTab = 'list' | 'manual';

@Component({
  selector: 'app-counter-rules',
  templateUrl: './counter-rules.component.html',
  styleUrls: ['./counter-rules.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    CounterRuleHeaderComponent,
    CounterRuleRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly ruleModal = viewChild.required<TemplateRef<unknown>>('ruleModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  public readonly CounterEventType = CounterEventType;
  public readonly CounterPeriod = CounterPeriod;
  public readonly RuleEnforcementMode = RuleEnforcementMode;

  public translate = inject(TranslateService);
  public dataManagementService = inject(DataManagementCounterRuleService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private manualLoaderService = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<PageTab>('list');
  readonly manualContent = signal<string>('');

  public editingRule: ICounterRule | null = null;
  public originalRule: ICounterRule | null = null;
  public isNewRule = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();

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
      console.error('Error initializing counter rules:', error);
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
      .loadManual(COUNTER_RULE_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe((content) => this.manualContent.set(content));
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'counterRules'
        ) {
          this.deleteRule(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingRule = this.dataManagementService.createRule();
    this.originalRule = null;
    this.isNewRule = true;
    this.openModal();
  }

  onClickEdit(rule: ICounterRule): void {
    const clonedRule = cloneObject<ICounterRule>(rule);
    this.editingRule = clonedRule;
    this.originalRule = rule;
    this.isNewRule = false;
    this.openModal();
  }

  onEventTypeChange(): void {
    if (
      this.editingRule &&
      this.editingRule.eventType !== CounterEventType.ShiftExceedingHours
    ) {
      this.editingRule.hoursThreshold = null;
    }
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
      this.modalService.componentContext = 'counterRules';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.translate.instant(
        'setting.counterRule.importDeleteWarning'
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
          console.error('Error deleting counter rule:', error);
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
      console.error('Error saving counter rule:', error);

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
    return (
      this.dataManagementService.validateRule(this.editingRule).length === 0
    );
  }

  getValidationErrors(): string[] {
    if (!this.editingRule) return [];
    return this.dataManagementService.validateRule(this.editingRule);
  }
}
