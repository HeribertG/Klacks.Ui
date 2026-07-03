// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Nested settings panel for managing ERP import tokens of a single drop point, with one-time
 * plaintext display after creation — the secret is never retrievable again afterwards.
 * @param dropPointId - Id of the drop point whose tokens are listed and created
 */

import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  input,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataErpImportTokenService } from 'src/app/infrastructure/api/settings/data-erp-import-token.service';
import { ErpDropPointTokenHeaderComponent } from './erp-drop-point-token-header/erp-drop-point-token-header.component';
import { ErpDropPointTokenRowComponent } from './erp-drop-point-token-row/erp-drop-point-token-row.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import {
  IErpImportToken,
  IErpImportTokenCreate,
  IErpImportTokenCreated,
  ERP_IMPORT_TOKEN_EXPIRY,
} from 'src/app/domain/models/settings/erp-import-token';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

interface ErpImportTokenFormModel {
  name: string;
  expiresInDays: string;
}

const ERP_DROP_POINT_TOKENS_CONTEXT = 'erp-drop-point-tokens';

@Component({
  selector: 'app-erp-drop-point-tokens',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    ErpDropPointTokenHeaderComponent,
    ErpDropPointTokenRowComponent,
    IconCopyGreyComponent,
  ],
  templateUrl: './erp-drop-point-tokens.component.html',
  styleUrls: ['./erp-drop-point-tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpDropPointTokensComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly dropPointId = input.required<string>();

  private tokenService = inject(DataErpImportTokenService);
  private toastService = inject(ToastShowService);
  private modalService = inject(ModalService);
  private clipboard = inject(Clipboard);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  tokens = signal<IErpImportToken[]>([]);
  isLoading = signal(false);
  showCreateForm = signal(false);
  createdToken = signal<IErpImportTokenCreated | null>(null);
  private isSaving = false;

  private formModel = signal<ErpImportTokenFormModel>({
    name: '',
    expiresInDays: String(ERP_IMPORT_TOKEN_EXPIRY.DEFAULT_DAYS),
  });

  tokenForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.expiresInDays, 300);
  });

  ngOnInit(): void {
    this.loadTokens();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === ERP_DROP_POINT_TOKENS_CONTEXT
        ) {
          this.revokeToken(this.modalService.Filing);
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

  private loadTokens(): void {
    this.isLoading.set(true);
    this.tokenService
      .getTokens(this.dropPointId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.tokens.set(tokens);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading ERP import tokens:', error);
          this.toastService.showError(
            this.translate.instant('settings.erp-drop-points.tokens.error.load')
          );
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onClickAdd(): void {
    this.createdToken.set(null);
    this.formModel.set({
      name: '',
      expiresInDays: String(ERP_IMPORT_TOKEN_EXPIRY.DEFAULT_DAYS),
    });
    this.showCreateForm.set(true);
  }

  onCancelCreate(): void {
    this.showCreateForm.set(false);
  }

  onDoneCreate(): void {
    this.createdToken.set(null);
    this.showCreateForm.set(false);
    this.loadTokens();
  }

  async onCreateToken(): Promise<void> {
    if (!this.isFormValid() || this.isSaving || this.createdToken()) {
      return;
    }

    this.isSaving = true;
    const formData = this.formModel();
    const request: IErpImportTokenCreate = {
      dropPointId: this.dropPointId(),
      name: formData.name.trim(),
    };
    const expiresInDays = parseInt(formData.expiresInDays, 10);
    if (!isNaN(expiresInDays)) {
      request.expiresInDays = expiresInDays;
    }

    try {
      const created = await firstValueFrom(this.tokenService.createToken(request));
      this.createdToken.set(created);
      this.toastService.showSuccess(
        this.translate.instant('settings.erp-drop-points.tokens.success.create'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch (error) {
      console.error('Error creating ERP import token:', error);
      this.toastService.showError(
        this.translate.instant('settings.erp-drop-points.tokens.error.save')
      );
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  onCopyToken(): void {
    const created = this.createdToken();
    if (!created) {
      return;
    }

    this.clipboard.copy(created.token);
    this.toastService.showSuccess(
      this.translate.instant('settings.erp-drop-points.tokens.success.copied'),
      this.translate.instant('TOAST_SUCCESS')
    );
  }

  openRevokeToken(token: IErpImportToken): void {
    if (!token.id) {
      return;
    }

    this.modalService.Filing = '';
    this.modalService.componentContext = ERP_DROP_POINT_TOKENS_CONTEXT;

    this.modalService.Filing = token.id;
    this.modalService.deleteMessage = this.translate.instant(
      'settings.erp-drop-points.tokens.confirm-revoke'
    );
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private async revokeToken(id: string): Promise<void> {
    try {
      await firstValueFrom(this.tokenService.revokeToken(id, this.dropPointId()));

      this.toastService.showSuccess(
        this.translate.instant('settings.erp-drop-points.tokens.success.delete'),
        this.translate.instant('TOAST_SUCCESS')
      );
      this.loadTokens();
    } catch (error) {
      console.error('Error revoking ERP import token:', error);
      this.toastService.showError(
        this.translate.instant('settings.erp-drop-points.tokens.error.delete')
      );
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    const formData = this.formModel();

    if (!formData.name.trim()) {
      return false;
    }

    if (formData.expiresInDays.trim() === '') {
      return true;
    }

    const expiresInDays = parseInt(formData.expiresInDays, 10);
    return (
      !isNaN(expiresInDays) &&
      expiresInDays >= ERP_IMPORT_TOKEN_EXPIRY.MIN_DAYS &&
      expiresInDays <= ERP_IMPORT_TOKEN_EXPIRY.MAX_DAYS
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    const formData = this.formModel();

    if (!formData.name.trim()) {
      errors.push(
        this.translate.instant('settings.erp-drop-points.tokens.validation.name-required')
      );
    }

    if (formData.expiresInDays.trim() !== '') {
      const expiresInDays = parseInt(formData.expiresInDays, 10);
      if (
        isNaN(expiresInDays) ||
        expiresInDays < ERP_IMPORT_TOKEN_EXPIRY.MIN_DAYS ||
        expiresInDays > ERP_IMPORT_TOKEN_EXPIRY.MAX_DAYS
      ) {
        errors.push(
          this.translate.instant('settings.erp-drop-points.tokens.validation.expiry-range')
        );
      }
    }

    return errors;
  }
}
