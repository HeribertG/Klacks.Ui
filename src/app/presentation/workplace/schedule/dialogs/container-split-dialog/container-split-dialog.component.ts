// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for splitting a container work at a user-defined time point into two containers.
 * @param workId - ID of the container work to split
 * @param shiftId - Shift ID used to create the copy container
 * @param clientId - Current client ID of the container (copy defaults to same client)
 * @param containerStart - Container start time (HH:MM)
 * @param containerEnd - Container end time (HH:MM)
 * @param currentDate - Date of the container work
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import {
  ContainerWorkChildren,
  DataContainerWorkChildrenService,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';
import {
  DataClientService,
  IClientForReplacement,
} from 'src/app/infrastructure/api/client/data-client.service';
import {
  CategorizationResult,
  ContainerSplitLogicService,
  SubWorkConflict,
} from './services/container-split-logic.service';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { OwnTime, Work } from 'src/app/domain/models/schedule/schedule-class';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';

export interface IOpenContainerSplitOptions {
  workId: string;
  shiftId: string;
  clientId: string;
  containerStart: string;
  containerEnd: string;
  currentDate: Date;
}

@Component({
  selector: 'app-container-split-dialog',
  standalone: true,
  imports: [TranslateModule, FormsModule, TimeInputComponent],
  templateUrl: './container-split-dialog.component.html',
  styleUrl: './container-split-dialog.component.scss',
  providers: [ContainerSplitLogicService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerSplitDialogComponent {
  private readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('modalTemplate');

  private ngbModal = inject(NgbModal);
  private childrenService = inject(DataContainerWorkChildrenService);
  private clientService = inject(DataClientService);
  private logicService = inject(ContainerSplitLogicService);
  private dataSchedule = inject(DataScheduleService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private lockService = inject(ContainerLockService);

  private modalRef: NgbModalRef | null = null;
  private allClients: IClientForReplacement[] = [];

  workId = '';
  shiftId = '';

  readonly containerStart = signal<string>('');
  readonly containerEnd = signal<string>('');
  readonly currentClientId = signal<string>('');
  readonly currentDate = signal<Date>(new Date());

  readonly splitTimeOwn = signal<OwnTime>(OwnTime.forTime('00', '00'));
  private readonly splitTimeTouched = signal<boolean>(false);
  readonly splitTime = computed(() => {
    if (!this.splitTimeTouched()) return '';
    const t = this.splitTimeOwn();
    return `${t.hours}:${t.minutes}`;
  });
  readonly replaceClientId = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly children = signal<ContainerWorkChildren | null>(null);
  readonly conflictResolutions = signal<Record<string, 'before' | 'after'>>({});

  readonly clientSearchResults = signal<{ id: string; displayName: string }[]>([]);
  readonly selectedClientName = signal<string>('');

  readonly isSplitTimeValid = computed(() =>
    this.logicService.isSplitTimeValid(
      this.splitTime(),
      this.containerStart(),
      this.containerEnd(),
    ),
  );

  readonly categorization = computed<CategorizationResult | null>(() => {
    const c = this.children();
    const t = this.splitTime();
    if (!c || !this.isSplitTimeValid()) return null;
    const result = this.logicService.categorizeItems(c, t);
    const resolutions = this.conflictResolutions();
    for (const conflict of result.conflicts) {
      conflict.resolution = resolutions[conflict.subWork.id] ?? null;
    }
    return result;
  });

  readonly allConflictsResolved = computed(() => {
    const cat = this.categorization();
    if (!cat) return false;
    return cat.conflicts.every((c) => c.resolution !== null);
  });

  readonly canSave = computed(
    () =>
      this.isSplitTimeValid() &&
      this.allConflictsResolved() &&
      !!this.replaceClientId() &&
      !this.isSaving(),
  );

  open(options: IOpenContainerSplitOptions): void {
    this.workId = options.workId;
    this.shiftId = options.shiftId;
    this.containerStart.set(options.containerStart);
    this.containerEnd.set(options.containerEnd);
    this.currentClientId.set(options.clientId);
    this.currentDate.set(options.currentDate);
    this.splitTimeOwn.set(OwnTime.forTime('00', '00'));
    this.splitTimeTouched.set(false);
    this.replaceClientId.set(null);
    this.conflictResolutions.set({});
    this.clientSearchResults.set([]);
    this.selectedClientName.set('');
    this.isLoading.set(true);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
    });

    this.lockService
      .acquire(ContainerLockResourceType.containerWork, this.workId)
      .subscribe({
        next: (lock) => {
          if (!lock.acquired) {
            this.isLoading.set(false);
            this.modalRef?.dismiss();
            return;
          }
          forkJoin({
            children: this.childrenService.loadChildren(this.workId),
            clients: this.clientService.getClientsForReplacement(),
          }).subscribe({
            next: ({ children, clients }) => {
              this.children.set(children);
              this.allClients = clients.filter((c) => c.id !== options.clientId);
              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false),
          });
        },
        error: () => {
          this.isLoading.set(false);
          this.modalRef?.dismiss();
        },
      });
  }

  onSplitTimeOwnChanged(value: OwnTime): void {
    this.splitTimeTouched.set(true);
    this.splitTimeOwn.set(OwnTime.forTime(value.hours, value.minutes));
    this.conflictResolutions.set({});
  }

  resolveConflict(conflict: SubWorkConflict, resolution: 'before' | 'after'): void {
    this.conflictResolutions.update((prev) => ({
      ...prev,
      [conflict.subWork.id]: resolution,
    }));
  }

  onClientSearch(query: string): void {
    if (query.trim().length < 2) {
      this.clientSearchResults.set([]);
      return;
    }
    const searchLower = query.toLowerCase();
    const matches = this.allClients
      .filter((c) => {
        const name = (c.name || '').toLowerCase();
        const firstName = (c.firstName || '').toLowerCase();
        const company = (c.company || '').toLowerCase();
        const idNumber = c.idNumber.toString();
        return (
          name.includes(searchLower) ||
          firstName.includes(searchLower) ||
          company.includes(searchLower) ||
          idNumber.includes(searchLower)
        );
      })
      .map((c) => ({ id: c.id, displayName: this.buildDisplayName(c) }));
    this.clientSearchResults.set(matches);
  }

  selectClient(id: string, displayName: string): void {
    this.replaceClientId.set(id);
    this.selectedClientName.set(displayName);
    this.clientSearchResults.set([]);
  }

  clearClient(): void {
    this.replaceClientId.set(null);
    this.selectedClientName.set('');
  }

  onSave(): void {
    const cat = this.categorization();
    if (!cat || !this.canSave()) return;

    const originalEndTime = this.containerEnd();
    const beforeChildren = this.buildBeforeChildren(cat);
    const afterChildren = this.buildAfterChildren(cat);
    const clientId = this.replaceClientId() ?? this.currentClientId();

    this.isSaving.set(true);

    this.childrenService.saveChildren(this.workId, beforeChildren).subscribe({
      next: () => this.createCopyWork(clientId, afterChildren, originalEndTime),
      error: () => this.isSaving.set(false),
    });
  }

  close(): void {
    this.lockService.release();
    this.modalRef?.dismiss();
  }

  private buildBeforeChildren(cat: CategorizationResult): ContainerWorkChildren {
    const beforeWorks = [
      ...cat.beforeWorks,
      ...cat.conflicts.filter((c) => c.resolution === 'before').map((c) => c.subWork),
    ];
    return {
      subWorks: beforeWorks,
      subBreaks: cat.beforeBreaks,
      subWorkChanges: this.children()?.subWorkChanges ?? [],
      parentEndTime: this.splitTime(),
    };
  }

  private buildAfterChildren(cat: CategorizationResult): ContainerWorkChildren {
    const afterWorks = [
      ...cat.afterWorks,
      ...cat.conflicts.filter((c) => c.resolution === 'after').map((c) => c.subWork),
    ];
    return {
      subWorks: afterWorks.map((w) => ({ ...w, id: crypto.randomUUID() })),
      subBreaks: cat.afterBreaks.map((b) => ({ ...b, id: crypto.randomUUID() })),
      subWorkChanges: [],
      parentStartTime: this.splitTime(),
    };
  }

  private createCopyWork(
    clientId: string,
    afterChildren: ContainerWorkChildren,
    originalEndTime: string,
  ): void {
    const splitTime = this.splitTime();
    const work = new Work();
    work.clientId = clientId;
    work.shiftId = this.shiftId;
    work.currentDate = new Date(this.currentDate());
    work.startTime = splitTime;
    work.endTime = originalEndTime;
    work.workTime = this.minutesBetween(splitTime, originalEndTime);
    work.analyseToken = this.analyseScenarioService.activeToken() ?? undefined;

    this.dataSchedule.addWork(work).subscribe({
      next: (newWork) => {
        if (!newWork.id) {
          this.restoreOriginal(originalEndTime);
          return;
        }
        this.acquireLockAndSaveAfterChildren(newWork.id, afterChildren, originalEndTime);
      },
      error: () => {
        this.restoreOriginal(originalEndTime);
      },
    });
  }

  private acquireLockAndSaveAfterChildren(
    newWorkId: string,
    afterChildren: ContainerWorkChildren,
    originalEndTime: string,
  ): void {
    this.lockService
      .acquire(ContainerLockResourceType.containerWork, newWorkId)
      .subscribe({
        next: (lock) => {
          if (!lock.acquired) {
            this.restoreOriginal(originalEndTime);
            return;
          }
          this.saveAfterChildren(newWorkId, afterChildren, originalEndTime);
        },
        error: () => {
          this.restoreOriginal(originalEndTime);
        },
      });
  }

  private saveAfterChildren(
    newWorkId: string,
    afterChildren: ContainerWorkChildren,
    originalEndTime: string,
  ): void {
    this.childrenService.saveChildren(newWorkId, afterChildren).subscribe({
      next: () => {
        this.lockService.release();
        this.isSaving.set(false);
        this.modalRef?.close();
      },
      error: () => {
        this.restoreOriginal(originalEndTime);
      },
    });
  }

  private restoreOriginal(originalEndTime: string): void {
    const restoreChildren: ContainerWorkChildren = {
      ...(this.children() ?? { subWorks: [], subBreaks: [], subWorkChanges: [] }),
      parentEndTime: originalEndTime,
    };
    this.lockService
      .acquire(ContainerLockResourceType.containerWork, this.workId)
      .subscribe({
        next: (lock) => {
          if (lock.acquired) {
            this.childrenService
              .saveChildren(this.workId, restoreChildren)
              .subscribe({
                complete: () => this.lockService.release(),
              });
          }
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false),
      });
  }

  private minutesBetween(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  private buildDisplayName(client: IClientForReplacement): string {
    if (client.legalEntity && client.company) {
      return `${client.idNumber} - ${client.company}`;
    }
    const parts = [client.name, client.firstName].filter(Boolean);
    return `${client.idNumber} - ${parts.join(' ')}`;
  }
}
