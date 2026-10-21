// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Lets any part of the schedule (grid context menu, row header, toolbar) ask the single recovery
 * dialog instance to open with a preset, without holding a reference to the dialog component. The
 * dialog subscribes once; every request is a one-shot event, so two identical requests in a row both
 * open the dialog.
 * @param requests$ - Stream of open requests carrying the preset the dialog should start from
 */
import { Injectable } from '@angular/core';
import { IRecoveryDialogPreset } from './recovery-dialog-preset.interface';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RecoveryDialogLauncherService {
  private readonly requestSubject = new Subject<IRecoveryDialogPreset>();

  readonly requests$: Observable<IRecoveryDialogPreset> = this.requestSubject.asObservable();

  requestOpen(preset: IRecoveryDialogPreset = {}): void {
    this.requestSubject.next(preset);
  }
}
