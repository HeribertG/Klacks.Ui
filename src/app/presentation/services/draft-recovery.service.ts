// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Captures the active editor's unsaved form data when an authentication loss
 * forces a redirect to the login page, and offers to restore it via a dialog
 * after a successful re-login.
 * The draft is stored session-scoped and keyed by the originating route, so it
 * is only offered when the user returns to the exact page they were editing.
 */
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SessionStorageService } from 'src/app/infrastructure/storage/session-storage.service';
import { IDraftable } from 'src/app/domain/interfaces/manageable.interface';
import { DraftRecoveryDialogComponent } from '../modal/draft-recovery-dialog/draft-recovery-dialog.component';

interface DraftPayload {
  routeUrl: string;
  draft: unknown;
  ts: number;
}

function isDraftable(manager: unknown): manager is IDraftable {
  return (
    !!manager &&
    typeof (manager as IDraftable).captureDraft === 'function' &&
    typeof (manager as IDraftable).restoreDraft === 'function'
  );
}

@Injectable({
  providedIn: 'root',
})
export class DraftRecoveryService {
  private static readonly DRAFT_KEY = 'draft-recovery';
  private static readonly DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

  private workplaceStateService = inject(WorkplaceStateService);
  private sessionStorageService = inject(SessionStorageService);
  private router = inject(Router);
  private ngbModal = inject(NgbModal);

  capture(): void {
    const manager = this.workplaceStateService.activeManager();
    if (!isDraftable(manager)) {
      return;
    }
    const draft = manager.captureDraft();
    if (draft == null) {
      return;
    }
    const payload: DraftPayload = {
      routeUrl: this.router.url,
      draft,
      ts: Date.now(),
    };
    void this.sessionStorageService.saveFilter(
      DraftRecoveryService.DRAFT_KEY,
      payload
    );
  }

  offerRestore(): void {
    const manager = this.workplaceStateService.activeManager();
    if (!isDraftable(manager)) {
      return;
    }
    void this.sessionStorageService
      .restoreFilter<DraftPayload>(DraftRecoveryService.DRAFT_KEY)
      .then((payload) => {
        if (!payload || payload.routeUrl !== this.router.url) {
          return;
        }
        const isFresh =
          Date.now() - payload.ts <= DraftRecoveryService.DRAFT_MAX_AGE_MS;
        void this.clear();
        if (isFresh) {
          this.openDialog(manager, payload.draft);
        }
      });
  }

  private openDialog(manager: IDraftable, draft: unknown): void {
    this.ngbModal
      .open(DraftRecoveryDialogComponent, { centered: true, size: 'sm' })
      .result.then(
        (restore: boolean) => {
          if (restore) {
            manager.restoreDraft(draft);
          }
        },
        () => {
          // Dialog dismissed - the draft is discarded.
        }
      );
  }

  clear(): Promise<boolean> {
    return this.sessionStorageService.removeFilter(
      DraftRecoveryService.DRAFT_KEY
    );
  }
}
