// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Host-side implementation of IPluginDeleteConfirmation: opens the shared delete modal with the default delete text
 * and reports the confirmed subject back to the plugin that requested it, keyed by a caller-supplied context so
 * several plugins never react to each other's dialogs.
 * @param modalService - Shared host modal that shows the delete dialog and reports the user's choice
 */

import { inject, Injectable } from '@angular/core';
import { filter, map, Observable, tap } from 'rxjs';
import { IPluginDeleteConfirmation } from 'klacks-plugin-contracts';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { DomainMessages } from 'src/app/domain/constants/messages';

const NO_CONTEXT = '';
const NO_SUBJECT = '';

@Injectable({ providedIn: 'root' })
export class PluginDeleteConfirmationService implements IPluginDeleteConfirmation {
  private readonly modalService = inject(ModalService);

  requestDelete(context: string, subjectId: string): void {
    this.modalService.componentContext = context;
    this.modalService.Filing = subjectId;
    this.modalService.deleteMessage = DomainMessages.DELETE_ENTRY;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  confirmedDeletes(context: string): Observable<string> {
    return this.modalService.resultEvent.pipe(
      filter((result: ModalType) => result === ModalType.Delete && this.modalService.componentContext === context),
      map(() => this.modalService.Filing),
      tap(() => {
        this.modalService.componentContext = NO_CONTEXT;
        this.modalService.Filing = NO_SUBJECT;
      }),
    );
  }
}
