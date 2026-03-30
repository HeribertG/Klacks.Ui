// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing messaging providers (add, edit, delete, test, toggle).
 * @param dataService - API service for messaging provider operations
 * @param toastService - Service for displaying toast notifications
 * @param ngbModal - NgbModal service for opening edit modals
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataMessagingService } from '../../services/data-messaging.service';
import { MessagingProvider } from '../../models/messaging-provider.model';
import { CreateMessagingProvider } from '../../models/create-messaging-provider.model';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MessagingProvidersHeaderComponent } from './messaging-providers-header/messaging-providers-header.component';
import { MessagingProvidersRowComponent } from './messaging-providers-row/messaging-providers-row.component';
import { MessagingProviderEditComponent } from './messaging-provider-edit/messaging-provider-edit.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

@Component({
  selector: 'app-messaging-providers',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MessagingProvidersHeaderComponent,
    MessagingProvidersRowComponent,
    MessagingProviderEditComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './messaging-providers.component.html',
  styleUrls: ['./messaging-providers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingProvidersComponent implements OnInit, OnDestroy {
  private dataService = inject(DataMessagingService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private manualLoader = inject(ManualLoaderService);
  private destroy$ = new Subject<void>();

  @ViewChild('editModal') editModal!: TemplateRef<any>;

  providers: MessagingProvider[] = [];
  isLoading = false;
  editingProvider: MessagingProvider | null = null;
  isNewProvider = false;
  tabId = signal<'form' | 'help'>('form');
  manualContent = signal('');
  selectedProviderType = signal('Telegram');

  ngOnInit(): void {
    this.loadProviders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProviders(): void {
    this.isLoading = true;
    this.dataService.getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (providers) => {
          this.providers = providers;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.showError('settings.messaging-providers.error.load');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onAdd(): void {
    this.isNewProvider = true;
    this.editingProvider = null;
    this.tabId.set('form');
    this.loadManual();
    setTimeout(() => {
      this.ngbModal.open(this.editModal, { size: 'lg' });
    }, 0);
  }

  onEdit(provider: MessagingProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.tabId.set('form');
    this.loadManual();
    setTimeout(() => {
      this.ngbModal.open(this.editModal, { size: 'lg' });
    }, 0);
  }

  async onDelete(provider: MessagingProvider): Promise<void> {
    try {
      await firstValueFrom(this.dataService.deleteProvider(provider.id));
      this.providers = this.providers.filter(p => p.id !== provider.id);
      this.toastService.showSuccess(
        this.translate.instant('settings.messaging-providers.success.delete'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.messaging-providers.error.delete'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onTest(provider: MessagingProvider): Promise<void> {
    try {
      const result = await firstValueFrom(this.dataService.testProvider(provider.id));
      if (result.success) {
        this.toastService.showSuccess(
          this.translate.instant('settings.messaging-providers.success.test'),
          this.translate.instant('TOAST_SUCCESS')
        );
      } else {
        this.toastService.showError(this.translate.instant('settings.messaging-providers.error.test'));
      }
    } catch {
      this.toastService.showError(this.translate.instant('settings.messaging-providers.error.test'));
    }
  }

  async onToggleEnabled(provider: MessagingProvider): Promise<void> {
    const newState = !provider.isEnabled;
    try {
      const updateDto: CreateMessagingProvider = {
        name: provider.name,
        displayName: provider.displayName,
        providerType: provider.providerType,
        isEnabled: newState,
        configJson: '',
      };
      await firstValueFrom(this.dataService.updateProvider(provider.id, updateDto));
      provider.isEnabled = newState;
      const messageKey = newState
        ? 'settings.messaging-providers.success.enable'
        : 'settings.messaging-providers.success.disable';
      this.toastService.showSuccess(
        this.translate.instant(messageKey),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.messaging-providers.error.toggle'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  onProviderTypeChanged(providerType: string): void {
    this.selectedProviderType.set(providerType);
    if (providerType !== 'SMS') {
      this.tabId.set('form');
    }
  }

  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('messaging-sms-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }

  async onSaved(dto: CreateMessagingProvider, modal: any): Promise<void> {
    try {
      if (this.isNewProvider) {
        const created = await firstValueFrom(this.dataService.createProvider(dto));
        this.providers = [...this.providers, created];
        this.toastService.showSuccess(
          this.translate.instant('settings.messaging-providers.success.create'),
          this.translate.instant('TOAST_SUCCESS')
        );
      } else if (this.editingProvider) {
        const updated = await firstValueFrom(this.dataService.updateProvider(this.editingProvider.id, dto));
        const index = this.providers.findIndex(p => p.id === this.editingProvider!.id);
        if (index >= 0) {
          this.providers[index] = updated;
          this.providers = [...this.providers];
        }
        this.toastService.showSuccess(
          this.translate.instant('settings.messaging-providers.success.update'),
          this.translate.instant('TOAST_SUCCESS')
        );
      }
      modal.close();
    } catch {
      this.toastService.showError(this.translate.instant('settings.messaging-providers.error.save'));
    } finally {
      this.cdr.markForCheck();
    }
  }
}
