// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Delete Confirmation Helper
 *
 * Builds the shared "user confirmed the delete modal for this component" stream,
 * replacing the copy-pasted resultEvent/componentContext wiring duplicated across
 * settings list components.
 */
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

/**
 * Emits the pending Filing id whenever the shared delete modal is confirmed
 * while componentContext matches the given key. Does not reset componentContext
 * or Filing - the caller keeps doing that as its own subscribe side effect, exactly
 * as before this extraction, so behavior stays identical per call site.
 *
 * @param modalService - Shared modal service holding resultEvent/componentContext/Filing
 * @param contextKey - The componentContext value this component owns (e.g. 'branches')
 * @returns Observable of the Filing id to delete
 */
export function deleteConfirmations(
  modalService: ModalService,
  contextKey: string
): Observable<string> {
  return modalService.resultEvent.pipe(
    filter(
      (result) =>
        result === ModalType.Delete && modalService.componentContext === contextKey
    ),
    map(() => modalService.Filing)
  );
}
