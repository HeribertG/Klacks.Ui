// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for report generation and context menu actions in the schedule row header.
 * @param scheduleReportCtx - Context service for schedule report generation and sending
 * @param reportDefaults - Default report templates
 * @param appSettings - Email configuration for send verification
 * @param toastShowService - Toast notifications for success/error
 * @param translateService - Translation service for messages
 * @param router - Navigation to address details
 * @param dataService - Grid data (rows, groups, clients)
 * @param dataManagementSchedule - Visible time period for report
 */
import { inject, Injectable, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';

@Injectable()
export class RowHeaderReportService {
  private scheduleReportCtx = inject(ScheduleReportContextService);
  private reportDefaults = inject(ReportDefaultsService);
  private appSettings = inject(AppSettingsManagementService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private dataService = inject(BaseDataService);
  private dataManagementSchedule = inject(DataManagementScheduleService);

  isEmailConfigured = computed(() => {
    const e = this.appSettings.emailSettings();
    return (
      !!e.outgoingServer &&
      !!e.outgoingServerPort &&
      !!e.username &&
      !!e.password
    );
  });

  loadDefaults(): void {
    this.reportDefaults.load();
  }

  createContextMenu(): Menu {
    const menuData = new Menu();
    menuData.list.push(...MenuDataTemplate.goToAddress());
    if (this.reportDefaults.hasDefault('schedule')) {
      menuData.list.push(...MenuDataTemplate.staffSchedule());
      if (this.isEmailConfigured()) {
        menuData.list.push(...MenuDataTemplate.sendStaffSchedule());
      }
    }
    menuData.list.push(...MenuDataTemplate.divider());
    menuData.list.push(...MenuDataTemplate.shiftPreferences());
    return menuData;
  }

  navigateToAddress(contextMenuRow: number): void {
    const row = contextMenuRow;
    if (row < 0 || row >= this.dataService.rows) {
      return;
    }

    const groupIndex = this.dataService.rowGroupIndex[row];
    if (groupIndex === undefined) {
      return;
    }

    const client = this.dataService.getGroupIndex(groupIndex);
    if (client?.id) {
      this.router.navigate(['/workplace/edit-address', client.id], {
        queryParams: { returnUrl: '/workplace/schedule' },
      });
    }
  }

  generateStaffSchedule(contextMenuRow: number): void {
    const row = contextMenuRow;
    const groupIndex = this.dataService.rowGroupIndex[row];
    const client = this.dataService.getGroupIndex(groupIndex);

    if (!client?.id) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;

    if (!startDate || !endDate) return;

    this.scheduleReportCtx.generateForClient(
      client.id,
      `${client.firstName} ${client.name}`,
      formatDateOnly(startDate),
      formatDateOnly(endDate),
    );
  }

  async sendStaffSchedule(contextMenuRow: number): Promise<void> {
    const row = contextMenuRow;
    const groupIndex = this.dataService.rowGroupIndex[row];
    const client = this.dataService.getGroupIndex(groupIndex);

    if (!client?.id) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;

    if (!startDate || !endDate) return;

    const clientName = `${client.firstName} ${client.name}`;

    try {
      const response = await this.scheduleReportCtx.sendForClient(
        client.id,
        clientName,
        formatDateOnly(startDate),
        formatDateOnly(endDate),
      );

      if (!response) return;

      if (response.success) {
        const msg = this.translateService.instant('schedule.send.success', {
          email: response.clientEmail,
        });
        this.toastShowService.showSuccess(
          msg,
          this.translateService.instant('schedule.send.title'),
          '',
          TOAST_ICONS.SUCCESS,
        );
      } else if (
        response.errorMessage === 'No email address found for client'
      ) {
        const msg = this.translateService.instant(
          'schedule.send.error.noEmail',
          { clientName },
        );
        this.toastShowService.showError(
          msg,
          'send-schedule',
          '',
          TOAST_ICONS.ERROR,
        );
      } else {
        const msg = this.translateService.instant(
          'schedule.send.error.failed',
          { clientName },
        );
        this.toastShowService.showError(
          msg,
          'send-schedule',
          response.errorMessage ?? '',
          TOAST_ICONS.ERROR,
        );
      }
    } catch {
      const msg = this.translateService.instant('schedule.send.error.failed', {
        clientName,
      });
      this.toastShowService.showError(
        msg,
        'send-schedule',
        '',
        TOAST_ICONS.ERROR,
      );
    }
  }
}
