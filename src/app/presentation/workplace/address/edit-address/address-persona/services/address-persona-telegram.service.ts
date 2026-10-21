// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Telegram invitation of the address persona card: offered for a stored, editable employee while the messaging
 * plugin is enabled and a Telegram provider is active; the result is shown as a toast.
 * @param outcome - Interpreted invitation result with the message key to show
 */

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { TelegramInvitationOutcome } from 'src/app/domain/services/messaging/telegram-invitation-outcome.interface';
import { TelegramInvitationService } from 'src/app/domain/services/messaging/telegram-invitation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AddressPersonaStateService } from './address-persona-state.service';

@Injectable()
export class AddressPersonaTelegramService {
  private dataManagementClientService = inject(DataManagementClientService);
  private featurePluginState = inject(FeaturePluginStateService);
  private telegramInvitationService = inject(TelegramInvitationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private state = inject(AddressPersonaStateService);
  private cdr = inject(ChangeDetectorRef);

  private telegramProviderActive = signal(false);

  canSendTelegramInvitation(): boolean {
    const client = this.dataManagementClientService.editClient();
    return (
      !!client
      && !!client.id
      && client.type === EntityTypeEnum.employee
      && this.featurePluginState.isPluginEnabled(MESSAGING_PLUGIN_NAME)
      && this.telegramProviderActive()
      && !this.state.isDisabled()
    );
  }

  sendTelegramInvitation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client?.id) return;
    this.telegramInvitationService.sendTelegramInvitation(client.id).subscribe({
      next: (resp) => this.showOutcome(this.telegramInvitationService.outcomeOf(resp.result)),
      error: (err: HttpErrorResponse) => this.showOutcome(this.telegramInvitationService.failureOf(err)),
    });
  }

  loadTelegramProviderAvailability(): void {
    this.featurePluginState.ensureLoaded().then(() => {
      if (!this.featurePluginState.isPluginEnabled(MESSAGING_PLUGIN_NAME)) {
        this.telegramProviderActive.set(false);
        return;
      }
      this.telegramInvitationService.isTelegramProviderActive().subscribe({
        next: (active) => {
          this.telegramProviderActive.set(active);
          this.cdr.markForCheck();
        },
        error: () => this.telegramProviderActive.set(false),
      });
    });
  }

  private showOutcome(outcome: TelegramInvitationOutcome): void {
    if (outcome.isSent) {
      this.toastShowService.showSuccess(this.translateService.instant(outcome.messageKey), '');
    } else {
      this.toastShowService.showError(this.translateService.instant(outcome.messageKey));
    }
  }
}
