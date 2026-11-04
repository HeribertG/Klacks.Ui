// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dialog for splitting a container work into two containers at a split time that lies between two of its items.
 * @param workId - ID of the container work to split
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
import { ContainerWorkChildrenService } from 'src/app/domain/services/schedule/container-work-children.service';
import { ContainerWorkChildren } from 'src/app/domain/models/container/container-work-children.interface';
import { ClientSearchService } from 'src/app/domain/services/client/client-search.service';
import { IClientForReplacement } from 'src/app/domain/models/client/client-for-replacement.interface';
import { ContainerSplitLogicService } from './services/container-split-logic.service';
import { SplitGap } from './services/split-gap.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { IOpenContainerSplitOptions } from './open-container-split-options.interface';

const SECONDS_SUFFIX = ':00';

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
  private childrenService = inject(ContainerWorkChildrenService);
  private clientSearchService = inject(ClientSearchService);
  private logicService = inject(ContainerSplitLogicService);
  private lockService = inject(ContainerLockService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);

  private modalRef: NgbModalRef | null = null;
  private allClients: IClientForReplacement[] = [];

  workId = '';

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

  readonly clientSearchResults = signal<{ id: string; displayName: string }[]>([]);
  readonly selectedClientName = signal<string>('');

  readonly splitGaps = computed<SplitGap[]>(() => {
    const c = this.children();
    if (!c) return [];
    return this.logicService.computeSplitGaps(c, this.containerStart(), this.containerEnd());
  });

  readonly hasSplitPoints = computed(() => this.splitGaps().length > 0);

  readonly isSplitTimeValid = computed(() =>
    this.logicService.isSplitTimeValid(this.splitTime(), this.splitGaps(), this.containerStart()),
  );

  readonly canSave = computed(
    () =>
      !!this.children() &&
      this.isSplitTimeValid() &&
      !!this.replaceClientId() &&
      !this.isSaving(),
  );

  open(options: IOpenContainerSplitOptions): void {
    this.workId = options.workId;
    this.containerStart.set(options.containerStart);
    this.containerEnd.set(options.containerEnd);
    this.currentClientId.set(options.clientId);
    this.currentDate.set(options.currentDate);
    this.splitTimeOwn.set(OwnTime.forTime('00', '00'));
    this.splitTimeTouched.set(false);
    this.replaceClientId.set(null);
    this.children.set(null);
    this.clientSearchResults.set([]);
    this.selectedClientName.set('');
    this.isLoading.set(true);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
    });
    this.modalRef.result.then(
      () => this.releaseHeldLock(),
      () => this.releaseHeldLock(),
    );

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
            clients: this.clientSearchService.getClientsForReplacement(),
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
  }

  selectSplitGap(gap: SplitGap): void {
    const { hours, minutes } = this.logicService.toTimeParts(gap.start);
    this.onSplitTimeOwnChanged(OwnTime.forTime(hours, minutes));
  }

  isSplitGapSelected(gap: SplitGap): boolean {
    return this.isSplitTimeValid() && this.logicService.isSplitTimeValid(this.splitTime(), [gap], this.containerStart());
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
    if (!this.canSave()) return;

    const targetClientId = this.replaceClientId() ?? this.currentClientId();
    this.isSaving.set(true);
    this.childrenService
      .splitContainer(this.workId, `${this.splitTime()}${SECONDS_SUFFIX}`, targetClientId)
      .subscribe({
        next: () => {
          this.lockService.release();
          this.isSaving.set(false);
          this.modalRef?.close();
          this.refreshSchedule();
        },
        error: () => this.isSaving.set(false),
      });
  }

  close(): void {
    this.lockService.release();
    this.modalRef?.dismiss();
  }

  private releaseHeldLock(): void {
    if (this.lockService.currentLock()) {
      this.lockService.release();
    }
  }

  private refreshSchedule(): void {
    const clientIds = new Set([
      this.currentClientId(),
      this.replaceClientId() ?? this.currentClientId(),
    ]);
    const date = this.currentDate();
    Promise.all(
      [...clientIds].map((id) => this.scheduleEntryCrud.refreshClientScheduleForDays(id, date)),
    ).catch((err) => {
      console.error('Error refreshing schedule after container split:', err);
    });
    this.workScheduleLoader.refreshAllLoadedPeriodHours();
  }

  private buildDisplayName(client: IClientForReplacement): string {
    if (client.legalEntity && client.company) {
      return `${client.idNumber} - ${client.company}`;
    }
    const parts = [client.name, client.firstName].filter(Boolean);
    return `${client.idNumber} - ${parts.join(' ')}`;
  }
}
