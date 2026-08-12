// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentation wrapper around the quick print flow that reports failures as toasts.
 * @param request - Quick print request forwarded to the domain service
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  QuickPrintOutcome,
  QuickPrintRequest,
  QuickPrintService,
} from 'src/app/domain/services/report/quick-print.service';

const NO_TEMPLATE_KEY = 'report.quickPrint.noTemplate';
const FAILED_KEY = 'report.quickPrint.failed';

@Injectable({ providedIn: 'root' })
export class QuickPrintActionService {
  private quickPrint = inject(QuickPrintService);
  private toastService = inject(ToastShowService);
  private translate = inject(TranslateService);

  async ensureDefaultsLoaded(): Promise<void> {
    await this.quickPrint.ensureDefaultsLoaded();
  }

  hasDefault(sourceId: string): boolean {
    return this.quickPrint.hasDefault(sourceId);
  }

  async print(request: QuickPrintRequest): Promise<void> {
    const outcome = await this.quickPrint.print(request);
    if (outcome === QuickPrintOutcome.NoDefaultTemplate || outcome === QuickPrintOutcome.TemplateNotFound) {
      this.toastService.showError(this.translate.instant(NO_TEMPLATE_KEY));
      return;
    }
    if (outcome === QuickPrintOutcome.Failed) {
      this.toastService.showError(this.translate.instant(FAILED_KEY));
    }
  }
}
