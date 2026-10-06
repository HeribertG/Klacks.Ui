// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Lets any part of the schedule (grid context menu, row header, toolbar) ask the single recovery
 * dialog instance to open with a preset, without holding a reference to the dialog component. The
 * dialog subscribes once; every request is a one-shot event, so two identical requests in a row both
 * open the dialog.
 * @param requests$ - Stream of open requests carrying the preset the dialog should start from
 */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface IRecoveryDialogPreset {
  /** The employee that fell out; empty means the planner picks one in the dialog. */
  clientId?: string;
  /** First day of the absence; empty means the dialog derives a default from the visible period. */
  date?: Date;
  /** Last day of the absence; empty means a single day. */
  untilDate?: Date;
}

@Injectable({ providedIn: 'root' })
export class RecoveryDialogLauncherService {
  private readonly requestSubject = new Subject<IRecoveryDialogPreset>();

  readonly requests$: Observable<IRecoveryDialogPreset> = this.requestSubject.asObservable();

  requestOpen(preset: IRecoveryDialogPreset = {}): void {
    this.requestSubject.next(preset);
  }
}
