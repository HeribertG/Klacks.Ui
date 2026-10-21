// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Bulk e-mail send of the visible schedule range to every loaded client, offered only when outgoing mail is
 * configured and enabled only while schedule changes are unsent.
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { IClientWork } from 'src/app/domain/models/schedule/client-work.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { SCHEDULE_HEADER_BULK_SEND_CLIENT_NAME, SCHEDULE_HEADER_BULK_SEND_TOAST } from '../schedule-header.constants';

@Injectable()
export class ScheduleHeaderBulkSendService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettings = inject(AppSettingsManagementService);
  private scheduleReportCtx = inject(ScheduleReportContextService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly isSending = signal(false);

  readonly isEmailConfigured = computed(() => {
    const e = this.appSettings.emailSettings();
    return !!e.outgoingServer && !!e.outgoingServerPort && !!e.username && !!e.password;
  });

  readonly isSendDisabled = computed(() => {
    return this.isSending() || !this.scheduleChangeService.hasDirtyClients();
  });

  async onSendAllSchedules(): Promise<void> {
    if (this.isSendDisabled()) return;

    const clients = this.dataManagementSchedule.clients;
    if (!clients?.length) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;
    if (!startDate || !endDate) return;

    this.isSending.set(true);

    try {
      const result = await this.scheduleReportCtx.sendForAllClients(
        this.toRecipients(clients),
        formatDateOnly(startDate),
        formatDateOnly(endDate),
      );

      const msg = this.translateService.instant('schedule.send.bulk.summary', {
        success: result.success,
        failed: result.failed,
        noEmail: result.noEmail,
      });
      this.toastShowService.showInfo(msg, SCHEDULE_HEADER_BULK_SEND_TOAST, '', TOAST_ICONS.INFO);
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('schedule.send.error.failed', {
          clientName: SCHEDULE_HEADER_BULK_SEND_CLIENT_NAME,
        }),
        SCHEDULE_HEADER_BULK_SEND_TOAST,
      );
    } finally {
      this.isSending.set(false);
    }
  }

  private toRecipients(clients: IClientWork[]): { id: string; name: string }[] {
    return clients
      .filter((c) => !!c.id)
      .map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ''} ${c.name ?? ''}`.trim(),
      }));
  }
}
