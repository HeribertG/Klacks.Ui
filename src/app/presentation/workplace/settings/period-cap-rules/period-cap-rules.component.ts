// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing period cap rules via a modal form.
 * Persists each rule immediately (no savebar); edit/create bind directly to
 * the working copy through ngModel, delete is confirmed through ModalService.
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
import { Subject, takeUntil } from 'rxjs';

import { PeriodCapRuleHeaderComponent } from './period-cap-rule-header/period-cap-rule-header.component';
import { PeriodCapRuleRowComponent } from './period-cap-rule-row/period-cap-rule-row.component';
import { DataManagementPeriodCapRuleService } from 'src/app/domain/services/scheduling/data-management-period-cap-rule.service';
import { IPeriodCapRule } from 'src/app/domain/models/scheduling/period-cap-rule.model';
import {
  PeriodCapPeriod,
  PeriodCapScope,
} from 'src/app/domain/enums/period-cap-rule.enums';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';

const COMPONENT_CONTEXT = 'periodCapRules';
const PERIOD_CAP_RULE_MANUAL_NAME = 'period-cap-rule-manual';

type PageTab = 'list' | 'manual';

@Component({
  selector: 'app-period-cap-rules',
  templateUrl: './period-cap-rules.component.html',
  styleUrls: ['./period-cap-rules.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    PeriodCapRuleHeaderComponent,
    PeriodCapRuleRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCapRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly ruleModal = viewChild.required<TemplateRef<unknown>>('ruleModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  public readonly PeriodCapPeriod = PeriodCapPeriod;
  public readonly PeriodCapScope = PeriodCapScope;

  public translate = inject(TranslateService);
  public dataManagementService = inject(DataManagementPeriodCapRuleService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private manualLoaderService = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<PageTab>('list');
  readonly manualContent = signal<string>('');

  public editingRule: IPeriodCapRule | null = null;
  public originalRule: IPeriodCapRule | null = null;
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
      console.error('Error initializing period cap rules:', error);
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
      .loadManual(PERIOD_CAP_RULE_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe((content) => this.manualContent.set(content));
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === COMPONENT_CONTEXT
        ) {
          void this.deleteRule(this.modalService.Filing);
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

  onClickEdit(rule: IPeriodCapRule): void {
    this.editingRule = cloneObject<IPeriodCapRule>(rule);
    this.originalRule = rule;
    this.isNewRule = false;
    this.openModal();
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
      this.modalService.componentContext = COMPONENT_CONTEXT;
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.translate.instant(
        'setting.periodCapRule.importDeleteWarning'
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
          console.error('Error deleting period cap rule:', error);
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
      console.error('Error saving period cap rule:', error);

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
