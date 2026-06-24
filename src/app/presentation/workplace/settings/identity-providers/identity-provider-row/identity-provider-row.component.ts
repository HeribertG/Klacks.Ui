// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ChangeDetectionStrategy,
  OnDestroy,
  TemplateRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IdentityProvider } from 'src/app/domain/models/settings/identity-provider-class';
import {
  IIdentityProviderListItem,
  ITestConnectionResult,
  ISyncResult
} from 'src/app/domain/interfaces/identity-provider.interface';
import {
  IdentityProviderType,
  IdentityProviderTypeLabels
} from 'src/app/domain/enums/identity-provider-enum';
import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-identity-provider-row',
  templateUrl: './identity-provider-row.component.html',
  styleUrls: ['./identity-provider-row.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    TrashIconRedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityProviderRowComponent implements OnDestroy {
  readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('content');
  readonly data = input.required<IIdentityProviderListItem>();
  readonly isDeleteEvent = output<void>();
  readonly cancelNewEvent = output<void>();
  readonly providerChangedEvent = output<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  public providerService = inject(DataManagementIdentityProviderService);
  private manualLoader = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);

  private wasSaved = false;
  private destroy$ = new Subject<void>();

  tabId = signal<'general' | 'connection' | 'oauth' | 'help'>('general');
  editProvider = signal<IdentityProvider | null>(null);
  testResult = signal<ITestConnectionResult | null>(null);
  syncResult = signal<ISyncResult | null>(null);
  manualContent = signal('');

  providerTypeOptions = Object.values(IdentityProviderType)
    .filter((v): v is IdentityProviderType => typeof v === 'number')
    .map((value) => ({
      value,
      label: IdentityProviderTypeLabels[value],
    }));

  isLdapType(): boolean {
    const p = this.editProvider();
    return p !== null && (p.type === IdentityProviderType.Ldap || p.type === IdentityProviderType.ActiveDirectory);
  }

  isOAuthType(): boolean {
    const p = this.editProvider();
    return p !== null && (p.type === IdentityProviderType.OAuth2 || p.type === IdentityProviderType.OpenIdConnect);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  open(content: unknown): void {
    this.openModalInternal(content);
  }

  openModal(): void {
    this.openModalInternal(this.contentTemplate());
  }

  private async openModalInternal(content: unknown): Promise<void> {
    this.wasSaved = false;
    this.tabId.set('general');
    this.testResult.set(null);
    this.syncResult.set(null);
    this.loadManual();

    if (this.data().isDirty === CreateEntriesEnum.new) {
      const newProvider = new IdentityProvider();
      newProvider.name = this.data().name;
      newProvider.type = this.data().type;
      newProvider.isDirty = CreateEntriesEnum.new;
      newProvider.port = 389;
      newProvider.userFilter = '(&(objectClass=user)(objectCategory=person))';
      this.editProvider.set(newProvider);
    } else {
      const loaded = await this.providerService.loadProvider(this.data().id);
      if (loaded) {
        this.editProvider.set(loaded);
      }
    }

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      async () => {
        const p = this.editProvider();
        if (p) {
          await this.providerService.saveProvider(p);
        }
        this.wasSaved = true;
        this.providerChangedEvent.emit();
        this.editProvider.set(null);
      },
      () => {
        if (!this.wasSaved && this.data().isDirty === CreateEntriesEnum.new) {
          this.cancelNewEvent.emit();
        }
        this.editProvider.set(null);
      }
    );
  }

  async onTestConnection(): Promise<void> {
    const p = this.editProvider();
    if (p && p.id) {
      const result = await this.providerService.testConnection(p.id);
      this.testResult.set(result);
    }
  }

  async onSyncClients(): Promise<void> {
    const p = this.editProvider();
    if (p && p.id) {
      const result = await this.providerService.syncClients(p.id);
      this.syncResult.set(result);
    }
  }

  onTypeChange(): void {
    const p = this.editProvider();
    if (!p) return;

    if (p.type === IdentityProviderType.Ldap) {
      p.port = 389;
      p.useSsl = false;
    } else if (p.type === IdentityProviderType.ActiveDirectory) {
      p.port = 389;
      p.useSsl = false;
      p.userFilter = '(&(objectClass=user)(objectCategory=person))';
    }
  }

  onUseSslChange(): void {
    const p = this.editProvider();
    if (!p) return;

    if (p.useSsl && (p.port === 389 || !p.port)) {
      p.port = 636;
    } else if (!p.useSsl && p.port === 636) {
      p.port = 389;
    }
  }

  async onSave(): Promise<void> {
    const p = this.editProvider();
    if (p) {
      await this.providerService.saveProvider(p);
    }
    this.wasSaved = true;
    this.providerChangedEvent.emit();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual('identity-provider-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
