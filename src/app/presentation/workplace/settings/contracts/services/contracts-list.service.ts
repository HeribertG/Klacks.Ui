// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Contract list of the settings card: loading, the search filter, the read refresh and the delete flow
 * through the shared delete modal.
 * @param searchTerm - Text of the header search the list is filtered by
 * @param filteredContracts - Listed contracts whose name contains the search term
 */

import { ChangeDetectorRef, computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { Observable, takeUntil } from 'rxjs';

import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { CONTRACTS_DELETE_CONTEXT } from '../contracts.constants';

@Injectable()
export class ContractsListService {
  private readonly injector = inject(Injector);
  private readonly dataManagementContractService = inject(DataManagementContractService);
  private readonly modalService = inject(ModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly message = DomainMessages.DELETE_ENTRY;

  readonly searchTerm = signal('');

  private readonly contractsView = signal<IContract[]>([]);

  readonly filteredContracts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.contractsView();
    if (!term) return list;
    return list.filter(c =>
      (c.name ?? '').toLowerCase().includes(term)
    );
  });

  /**
   * Starts the effect that re-reads the list whenever the contract service signals a completed read.
   */
  connect(): void {
    effect(() => {
      if (this.dataManagementContractService.isRead()) {
        this.syncContractsView();
        this.cdr.markForCheck();
      }
    }, { injector: this.injector });
  }

  async initialize(): Promise<void> {
    try {
      await this.dataManagementContractService.init();
      this.syncContractsView();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  reload(): void {
    this.dataManagementContractService.readContracts().then(() => {
      this.syncContractsView();
      this.cdr.markForCheck();
    });
  }

  /**
   * Deletes the contract of every confirmed delete modal owned by this card until the card is destroyed.
   * @param until - Emits when the card is destroyed
   */
  watchDeleteConfirmations(until: Observable<void>): void {
    deleteConfirmations(this.modalService, CONTRACTS_DELETE_CONTEXT)
      .pipe(takeUntil(until))
      .subscribe((id) => {
        this.deleteContract(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  openDeleteContract(index: number): void {
    const contracts = this.dataManagementContractService.contracts;
    if (index >= 0 && index < contracts.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = CONTRACTS_DELETE_CONTEXT;
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private syncContractsView(): void {
    this.contractsView.set([...this.dataManagementContractService.contracts]);
  }

  private async deleteContract(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const contracts = this.dataManagementContractService.contracts;

    if (index >= 0 && index < contracts.length) {
      const contract = contracts[index];

      if (contract) {
        try {
          if (contract.id) {
            await this.dataManagementContractService.deleteContract(
              contract.id
            );
          } else {
            contracts.splice(index, 1);
            this.syncContractsView();
          }
        } catch (error) {
          console.error('Error deleting contract:', error);
        }
      }
    }
  }
}
