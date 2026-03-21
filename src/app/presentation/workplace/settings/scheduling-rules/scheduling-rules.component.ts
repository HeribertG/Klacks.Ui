// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ChangeDetectionStrategy,
  ElementRef,
  effect,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  TemplateRef,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
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
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

@Component({
  selector: 'app-scheduling-rules',
  templateUrl: './scheduling-rules.component.html',
  styleUrls: ['./scheduling-rules.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SchedulingRuleHeaderComponent,
    SchedulingRuleRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingRulesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('ruleModal', { read: TemplateRef })
  ruleModal!: TemplateRef<unknown>;
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementService = inject(DataManagementSchedulingRuleService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private manualLoader = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);

  public editingRule: ISchedulingRule | null = null;
  public originalRule: ISchedulingRule | null = null;
  public isNewRule = false;
  private isSaving = false;
  private destroy$ = new Subject<void>();
  tabId = signal<'form' | 'help'>('form');
  manualContent = signal('');

  message = DomainMessages.DELETE_ENTRY;

  private isReadEffect = effect(() => {
    if (this.dataManagementService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementService.init();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing scheduling rules:', error);
    }
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'schedulingRules'
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

  onClickEdit(rule: ISchedulingRule): void {
    const clonedRule = cloneObject<ISchedulingRule>(rule);
    this.editingRule = clonedRule;
    this.originalRule = rule;
    this.isNewRule = false;
    this.openModal();
  }

  private openModal(): void {
    this.tabId.set('form');
    this.loadManual();

    setTimeout(() => {
      this.ngbModal.open(this.ruleModal, {
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

        if (this.containerBox?.nativeElement) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (this.containerBox?.nativeElement) {
                this.containerBox.nativeElement.scrollTop =
                  this.containerBox.nativeElement.scrollHeight;
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
    return (
      this.dataManagementService.validateRule(this.editingRule).length === 0
    );
  }

  getValidationErrors(): string[] {
    if (!this.editingRule) return [];
    return this.dataManagementService.validateRule(this.editingRule);
  }

  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('scheduling-rule-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
