// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Deactivation of the current address of the address persona card: asks for confirmation through the shared delete
 * modal and removes the address once its own confirmation arrives.
 * @param destroy$ - Emits when the card is destroyed and ends the modal result subscription
 */

import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { Observable, takeUntil } from 'rxjs';

import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ADDRESS_PERSONA_DELETE_CONTEXT } from '../address-persona.constants';
import { AddressPersonaLabelsService } from './address-persona-labels.service';
import { AddressPersonaStateService } from './address-persona-state.service';

@Injectable()
export class AddressPersonaAddressRemovalService {
  private dataManagementClientService = inject(DataManagementClientService);
  private modalService = inject(ModalService);
  private labels = inject(AddressPersonaLabelsService);
  private state = inject(AddressPersonaStateService);
  private cdr = inject(ChangeDetectorRef);

  connect(destroy$: Observable<void>): void {
    this.modalService.resultEvent
      .pipe(takeUntil(destroy$))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete && this.modalService.componentContext === ADDRESS_PERSONA_DELETE_CONTEXT) {
          this.onDeleteCurrentAddress();
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
        this.cdr.markForCheck();
      });
  }

  openDeleteAddress(): void {
    this.modalService.Filing = '';
    this.modalService.componentContext = ADDRESS_PERSONA_DELETE_CONTEXT;
    this.modalService.deleteMessage = this.labels.message;
    this.modalService.deleteMessageTitle = this.labels.title;
    this.modalService.deleteMessageOkButton = this.labels.title;
    this.modalService.openModel(ModalType.Delete);
  }

  onDeleteCurrentAddress(): void {
    this.dataManagementClientService.removeCurrentAddress();
    this.state.notifyChanging(true);
  }
}
