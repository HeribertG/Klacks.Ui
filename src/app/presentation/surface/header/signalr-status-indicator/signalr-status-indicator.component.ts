// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Small status indicator showing the global SignalR connection state.
 * Displayed in the main header so real-time connection health is visible
 * from every workplace page.
 * @param signalRService - SignalR connection service (work-notifications hub)
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';

@Component({
  selector: 'app-signalr-status-indicator',
  standalone: true,
  imports: [NgbTooltip, TranslateModule],
  templateUrl: './signalr-status-indicator.component.html',
  styleUrls: ['./signalr-status-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalRStatusIndicatorComponent {
  private signalRService = inject(SignalRService);

  readonly connected = computed(() => this.signalRService.isConnected);
  readonly tooltipKey = computed(() =>
    this.connected() ? 'signalr.status.connected' : 'signalr.status.disconnected'
  );
}
