// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads the playground status at app start. A valid answer (limit on or off) and a client error such as 404 from an
 * older backend are final: customer installations behave exactly as before and are never asked again. A network
 * failure, a server error or a timeout leaves the status unknown instead; the first send or voice start asks once
 * more. While a request is in flight the status gate holds back sending and voice start; a timeout cancels the
 * request, so a late answer can never change the state afterwards.
 */
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { PLAYGROUND_STATUS_TIMEOUT_MS } from 'src/app/domain/constants/playground.constants';
import { isPlaygroundStatusUnknownError } from 'src/app/domain/helpers/playground-token-limit.helper';
import { DataPlaygroundService } from 'src/app/infrastructure/api/data-playground.service';
import { PlaygroundDeviceService } from './playground-device.service';
import { PlaygroundStatusGateService } from './playground-status-gate.service';

@Injectable({ providedIn: 'root' })
export class PlaygroundStatusService {
  private readonly dataPlayground = inject(DataPlaygroundService);
  private readonly device = inject(PlaygroundDeviceService);
  private readonly gate = inject(PlaygroundStatusGateService);

  constructor() {
    this.gate.registerRecheck(() => this.load());
  }

  async load(): Promise<void> {
    this.gate.begin();
    try {
      const status = await firstValueFrom(
        this.dataPlayground.getStatus(this.device.storedToken()).pipe(timeout({ first: PLAYGROUND_STATUS_TIMEOUT_MS })),
      );
      this.device.applyStatus(status);
      this.gate.markUnknown(false);
    } catch (error) {
      if (isPlaygroundStatusUnknownError(error)) {
        this.gate.markUnknown(true);
      } else {
        this.device.applyStatus({ limitActive: false, deviceToken: null });
        this.gate.markUnknown(false);
      }
    } finally {
      this.gate.end();
    }
  }
}
