// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Opens the contract dialog for a new or a listed contract and saves it.
 * @param views - Dialog template and list container of the contracts card, bound by the component
 * @param isSaving - True while a save is running, so a second save click is ignored
 */

import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { ContractEditorViews } from '../contract-editor-views.interface';
import { CONTRACT_DIALOG_OPTIONS, CONTRACT_LIST_SCROLL_DELAY_MS } from '../contracts.constants';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractEditorSessionService {
  private readonly state = inject(ContractEditorStateService);
  private readonly dataManagementContractService = inject(DataManagementContractService);
  private readonly ngbModal = inject(NgbModal);
  private readonly cdr = inject(ChangeDetectorRef);

  private views!: ContractEditorViews;
  private isSaving = false;

  bind(views: ContractEditorViews): void {
    this.views = views;
  }

  onClickAdd(): void {
    this.state.editingContract = this.dataManagementContractService.createContract();
    this.state.load(this.state.editingContract);

    this.state.originalContract = null;
    this.state.isNewContract = true;

    void this.dataManagementContractService.loadIndividualPeriods();

    setTimeout(() => {
      this.ngbModal.open(this.views.contractModal(), CONTRACT_DIALOG_OPTIONS);
    }, 0);
  }

  onClickEdit(contract: IContract): void {
    const clonedContract = cloneObject<IContract>(contract);
    this.dataManagementContractService.prepareContractForEdit(clonedContract);

    this.state.editingContract = clonedContract;
    this.state.load(clonedContract);
    this.state.originalContract = contract;
    this.state.isNewContract = false;

    void this.dataManagementContractService.loadIndividualPeriods();

    this.ngbModal.open(this.views.contractModal(), CONTRACT_DIALOG_OPTIONS);
  }

  async onSaveModal(modal: Pick<NgbActiveModal, 'close'>): Promise<void> {
    const saved = await this.saveContract();
    if (saved) {
      modal.close();
    }
  }

  private async saveContract(): Promise<boolean> {
    if (!this.state.editingContract || this.isSaving) {
      return false;
    }

    this.state.applyToContract();

    if (!this.state.isFormValid()) {
      return false;
    }

    this.isSaving = true;

    try {
      if (this.state.originalContract) {
        Object.assign(this.state.originalContract, this.state.editingContract);
        return await this.dataManagementContractService.saveExistingContract(
          this.state.originalContract
        );
      } else {
        this.dataManagementContractService.contracts.push(this.state.editingContract);
        const saved = await this.dataManagementContractService.saveExistingContract(
          this.state.editingContract
        );
        this.state.originalContract = this.state.editingContract;
        this.state.isNewContract = false;

        this.scrollListToEnd();
        return saved;
      }
    } catch (error) {
      console.error('Error saving contract:', error);

      try {
        await this.dataManagementContractService.readContracts();
      } catch (reloadError) {
        console.error(
          'Error reloading contracts after save error:',
          reloadError
        );
      }
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private scrollListToEnd(): void {
    if (this.views.containerBox()?.nativeElement) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this.views.containerBox()?.nativeElement) {
            this.views.containerBox()!.nativeElement.scrollTop =
              this.views.containerBox()!.nativeElement.scrollHeight;
          }
        }, CONTRACT_LIST_SCROLL_DELAY_MS);
      });
    }
  }
}
