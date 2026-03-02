// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ConductorService } from 'src/app/domain/services/automation/conductor/conductor.service';
import { ScheduleConductorContextService } from 'src/app/application/services/schedule-conductor-context.service';
import { IEvolutionProgress } from 'src/app/domain/models/automation/conductor/evolution-progress.model';
import { IConductorResult } from 'src/app/domain/models/automation/conductor/conductor-result.model';
import { IAssignmentResult } from 'src/app/domain/models/automation/conductor/assignment-result.model';

type WizardPhase = 'running' | 'done' | 'error' | 'cancelled';

@Component({
  selector: 'app-wizard-dialog',
  templateUrl: './wizard-dialog.component.html',
  styleUrls: ['./wizard-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class WizardDialogComponent {
  @ViewChild('wizardModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private conductor = inject(ConductorService);
  private contextService = inject(ScheduleConductorContextService);

  phase = signal<WizardPhase>('running');
  progress = signal<IEvolutionProgress | null>(null);
  result = signal<IConductorResult | null>(null);
  errorMessage = signal('');
  sortedAssignments = signal<IAssignmentResult[]>([]);

  private modalRef: NgbModalRef | null = null;
  private cancellationToken = { isCancelled: false };

  get progressPercent(): number {
    const p = this.progress();
    if (!p || p.maxGenerations === 0) return 0;
    return Math.round((p.currentGeneration / p.maxGenerations) * 100);
  }

  open(): void {
    this.reset();
    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });

    this.modalRef.dismissed.subscribe(() => {
      this.cancelIfRunning();
    });

    this.runScheduling();
  }

  onCancel(): void {
    this.cancelIfRunning();
    this.modalRef?.close();
  }

  onClose(): void {
    this.modalRef?.close();
  }

  private reset(): void {
    this.phase.set('running');
    this.progress.set(null);
    this.result.set(null);
    this.errorMessage.set('');
    this.sortedAssignments.set([]);
    this.cancellationToken = { isCancelled: false };
  }

  private cancelIfRunning(): void {
    if (this.phase() === 'running') {
      this.cancellationToken.isCancelled = true;
      this.conductor.cancelWorker();
    }
  }

  private async runScheduling(): Promise<void> {
    const context = this.contextService.buildContext();

    if (!context) {
      this.phase.set('error');
      this.errorMessage.set('No shifts or clients available for scheduling');
      return;
    }

    try {
      const conductorResult = await this.conductor.schedule(context, {
        useWorker: true,
        cancellationToken: this.cancellationToken,
        onProgress: (p: IEvolutionProgress) => {
          this.progress.set({ ...p });
        },
      });

      if (this.cancellationToken.isCancelled) {
        this.phase.set('cancelled');
        return;
      }

      this.result.set(conductorResult);
      this.sortedAssignments.set(
        [...conductorResult.assignments].sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
          const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
          return dateA - dateB;
        }),
      );
      this.phase.set('done');
    } catch (err) {
      if (this.cancellationToken.isCancelled) {
        this.phase.set('cancelled');
        return;
      }
      this.phase.set('error');
      this.errorMessage.set(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  formatDate(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatMotivation(value: number): string {
    return (value * 100).toFixed(0);
  }

  formatHours(value: number): string {
    return value.toFixed(1);
  }
}
