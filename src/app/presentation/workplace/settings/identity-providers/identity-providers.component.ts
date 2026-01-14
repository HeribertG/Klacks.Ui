import { Component, inject, AfterViewInit, OnDestroy, OnInit, ViewChildren, QueryList } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IdentityProviderHeaderComponent } from './identity-provider-header/identity-provider-header.component';
import { IdentityProviderRowComponent } from './identity-provider-row/identity-provider-row.component';
import { IdentityProvider } from 'src/app/domain/models/identity-provider-class';
import { IIdentityProviderListItem } from 'src/app/domain/interfaces/identity-provider.interface';
import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

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
})
export class IdentityProvidersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren(IdentityProviderRowComponent) providerRows!: QueryList<IdentityProviderRowComponent>;

  public translate = inject(TranslateService);
  public providerService = inject(DataManagementIdentityProviderService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  message = MessageLibrary.DELETE_ENTRY;
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
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    const provider = new IdentityProvider();
    provider.name = MessageLibrary.NOT_DEFINED;
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
