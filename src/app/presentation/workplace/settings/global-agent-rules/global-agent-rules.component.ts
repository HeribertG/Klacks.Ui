// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataGlobalRuleService } from 'src/app/infrastructure/api/assistant/data-global-rule.service';
import { IGlobalAgentRule } from 'src/app/domain/interfaces/global-agent-rule.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';


interface GlobalRuleFormModel {
  name: string;
  content: string;
  sortOrder: string;
}

@Component({
  selector: 'app-global-agent-rules',
  standalone: true,
  imports: [
    FormsModule,
    Field,
    TranslateModule,
    NgbModule,
    SettingsListCardComponent,
  ],
  templateUrl: './global-agent-rules.component.html',
  styleUrls: ['./global-agent-rules.component.scss'],
})
export class GlobalAgentRulesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('ruleModal', { read: TemplateRef }) ruleModal!: TemplateRef<unknown>;

  private ruleService = inject(DataGlobalRuleService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  protected readonly CONTENT_PREVIEW_LENGTH = 80;

  rules: IGlobalAgentRule[] = [];
  isLoading = false;
  editingRule: IGlobalAgentRule | null = null;
  private originalRule: IGlobalAgentRule | null = null;

  isNewRule = false;
  message = DomainMessages.DELETE_ENTRY;
  private isSaving = false;

  private formModel = signal<GlobalRuleFormModel>({
    name: '',
    content: '',
    sortOrder: '0',
  });

  ruleForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.content, 300);
    debounce(f.sortOrder, 300);
  });

  ngOnInit(): void {
    this.loadRules();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'global-agent-rules'
        ) {
          this.deleteRule(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRules(): void {
    this.isLoading = true;
    this.ruleService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rules) => {
          this.rules = rules;
          this.isLoading = false;
        },
        error: () => {
          this.toastService.showError('settings.global-rules.error.load');
          this.isLoading = false;
        },
      });
  }

  onClickAdd(): void {
    this.isNewRule = true;
    this.editingRule = {
      id: '',
      name: '',
      content: '',
      sortOrder: this.rules.length,
      isActive: true,
      version: 1,
      createTime: '',
    };

    this.initFormFromRule(this.editingRule);
    this.originalRule = null;

    setTimeout(() => {
      this.ngbModal.open(this.ruleModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private initFormFromRule(rule: IGlobalAgentRule): void {
    this.formModel.set({
      name: rule.name || '',
      content: rule.content || '',
      sortOrder: String(rule.sortOrder ?? 0),
    });
  }

  private applyFormToRule(): void {
    if (!this.editingRule) return;
    const formData = this.formModel();
    this.editingRule.name = formData.name.toUpperCase().replace(/\s+/g, '_');
    this.editingRule.content = formData.content;
    this.editingRule.sortOrder = parseInt(formData.sortOrder, 10) || 0;
  }

  async onSaveModal(modal: unknown): Promise<void> {
    const success = await this.saveRule();
    if (success) {
      (modal as { close: () => void }).close();
    }
  }

  onClickEdit(rule: IGlobalAgentRule): void {
    this.isNewRule = false;
    this.editingRule = { ...rule };
    this.originalRule = rule;
    this.initFormFromRule(this.editingRule);

    setTimeout(() => {
      this.ngbModal.open(this.ruleModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  openDeleteModal(rule: IGlobalAgentRule): void {
    this.modalService.Filing = '';
    this.modalService.componentContext = 'global-agent-rules';

    this.modalService.Filing = rule.name;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private async deleteRule(name: string): Promise<void> {
    try {
      await firstValueFrom(this.ruleService.deactivate(name));

      const index = this.rules.findIndex(r => r.name === name);
      if (index !== -1) {
        this.rules.splice(index, 1);
      }

      this.toastService.showSuccess(
        'settings.global-rules.success.delete',
        'Success'
      );
    } catch {
      this.toastService.showError('settings.global-rules.error.delete');
    }
  }

  private async saveRule(): Promise<boolean> {
    if (!this.editingRule || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToRule();
    this.isSaving = true;

    try {
      const result = await firstValueFrom(
        this.ruleService.upsert(this.editingRule.name, {
          content: this.editingRule.content,
          sortOrder: this.editingRule.sortOrder,
        })
      );

      if (this.originalRule) {
        const idx = this.rules.findIndex(r => r.name === this.originalRule!.name);
        if (idx !== -1) {
          this.rules[idx] = { ...this.rules[idx], ...this.editingRule, version: result.version };
        }
        this.toastService.showSuccess(
          'settings.global-rules.success.update',
          'Success'
        );
      } else {
        this.rules.push({ ...this.editingRule, version: result.version });
        this.toastService.showSuccess(
          'settings.global-rules.success.create',
          'Success'
        );
      }

      return true;
    } catch {
      this.toastService.showError('settings.global-rules.error.save');
      this.loadRules();
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  isFormValid(): boolean {
    if (!this.editingRule) return false;
    const formData = this.formModel();
    return !!(formData.name.trim() && formData.content.trim());
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingRule) return errors;

    const formData = this.formModel();

    if (!formData.name.trim()) {
      errors.push('Rule name is required');
    }
    if (!formData.content.trim()) {
      errors.push('Rule content is required');
    }

    return errors;
  }

  getContentPreview(content: string): string {
    return content.length > this.CONTENT_PREVIEW_LENGTH
      ? content.substring(0, this.CONTENT_PREVIEW_LENGTH) + '...'
      : content;
  }
}
