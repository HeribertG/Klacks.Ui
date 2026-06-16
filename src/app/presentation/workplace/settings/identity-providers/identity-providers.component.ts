// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, AfterViewInit, OnDestroy, OnInit, ViewChildren, QueryList } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IdentityProviderHeaderComponent } from './identity-provider-header/identity-provider-header.component';
import { IdentityProviderRowComponent } from './identity-provider-row/identity-provider-row.component';
import { IdentityProvider } from 'src/app/domain/models/settings/identity-provider-class';
import { IIdentityProviderListItem } from 'src/app/domain/interfaces/identity-provider.interface';
import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

@Component({
  selector: 'app-identity-providers',
  templateUrl: './identity-providers.component.html',
  styleUrls: ['./identity-providers.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    SettingsListCardComponent,
    IdentityProviderHeaderComponent,
    IdentityProviderRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityProvidersComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.IDENTITY_PROVIDER;
  @ViewChildren(IdentityProviderRowComponent) providerRows!: QueryList<IdentityProviderRowComponent>;
  public providerService = inject(DataManagementIdentityProviderService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;
  private destroy$ = new Subject<void>();

  message = DomainMessages.DELETE_ENTRY;
  private pendingOpenProvider: IdentityProvider | null = null;

  ngOnInit(): void {
    this.providerService.loadProviders();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'identity-providers'
        ) {
          this.deleteProvider(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });

    this.providerRows.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.pendingOpenProvider !== null) {
          const row = this.providerRows.find(r => r.data === this.pendingOpenProvider);
          if (row) {
            setTimeout(() => row.openModal(), 0);
          }
          this.pendingOpenProvider = null;
        }
        this.cdr.markForCheck();
      });

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.providerService.loadProviders();
  }

  onClickAdd(): void {
    const provider = new IdentityProvider();
    provider.name = DomainMessages.NOT_DEFINED;
    provider.isDirty = CreateEntriesEnum.new;

    this.pendingOpenProvider = provider;
    this.providerService.providerList.update(list => [...list, provider as IIdentityProviderListItem]);
  }

  cancelNewProvider(index: number): void {
    const providers = this.providerService.providerList();
    if (index >= 0 && index < providers.length) {
      this.providerService.providerList.update(list => [
        ...list.slice(0, index),
        ...list.slice(index + 1)
      ]);
    }
  }

  onProviderChanged(index: number): void {
    const providers = this.providerService.providerList();
    if (index >= 0 && index < providers.length) {
      this.providerService.providerList.update(list => [...list]);
    }
  }

  openDeleteProvider(index: number): void {
    const providers = this.providerService.providerList();

    if (index >= 0 && index < providers.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'identity-providers';

      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteProvider(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const providers = this.providerService.providerList();

    if (index >= 0 && index < providers.length) {
      const provider = providers[index];

      if (provider) {
        if (provider.isDirty === CreateEntriesEnum.new) {
          this.providerService.providerList.update(list => [
            ...list.slice(0, index),
            ...list.slice(index + 1)
          ]);
        } else {
          await this.providerService.deleteProvider(provider.id);
        }
      }
    }
  }
}
