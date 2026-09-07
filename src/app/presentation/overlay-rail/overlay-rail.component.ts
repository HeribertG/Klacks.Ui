// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The single owner of position, edge anchor and stacking order for every floating overlay at the
 * inline edge. Individual overlays contribute content only; none of them positions itself.
 *
 * Zones render in a fixed order that follows attention, not arrival: the interrupt sits first and
 * outside any scroll region so a question can never scroll out of view, autohide messages append
 * after it so they cannot displace it, and the ambient assistant cards come last and are the only
 * part that scrolls.
 *
 * @param asideDocked - Whether the aside panel occupies the inline edge, which pushes the rail inward
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastsContainerComponent } from '../toast/toast.component';
import { AssistantPanelsComponent } from '../aside/assistant-chat/assistant-panels/assistant-panels.component';
import { VoiceShellComponent } from '../voice-shell/voice-shell.component';
import { VoiceShellInputComponent } from '../voice-shell/voice-shell-input/voice-shell-input.component';
import { AsideService } from '../aside/aside.service';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';

@Component({
  selector: 'app-overlay-rail',
  standalone: true,
  imports: [
    ToastsContainerComponent,
    AssistantPanelsComponent,
    VoiceShellComponent,
    VoiceShellInputComponent,
  ],
  templateUrl: './overlay-rail.component.html',
  styleUrls: ['./overlay-rail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.aside-docked]': 'asideDocked()',
  },
})
export class OverlayRailComponent {
  private readonly asideService = inject(AsideService);
  private readonly outputModes = inject(SpeechOutputModeService);

  /**
   * The aside only occupies the edge when it renders its real panel. In a floating output mode it
   * mounts a zero-sized bootstrap host instead, so the rail keeps the edge for itself.
   */
  readonly asideDocked = computed<boolean>(
    () => this.asideService.isVisible() && !this.outputModes.isFloatingMode(),
  );

  /**
   * The bubble is rendered by the rail rather than beside it. It is the only control that operates
   * the assistant in a floating mode, so nothing may cover it - and keeping it in the same flow as
   * the toasts is the only way to guarantee that without both sides sharing hard-coded offsets.
   */
  readonly showVoiceShell = computed<boolean>(
    () => this.asideService.isVisible() && this.outputModes.isFloatingMode(),
  );

  /** The input bar belongs to the bubble and grows with its text, so it has to sit in the flow too. */
  readonly showFloatingInput = computed<boolean>(
    () => this.asideService.isVisible() && this.outputModes.isAutoSpeakMode(),
  );

  /**
   * The assistant's ambient surfaces - goal candidates and the proactive inbox - are their own
   * lane in every output mode, not a section of the conversation. They follow the assistant being
   * open, not the mode it speaks in.
   */
  readonly showPersistentZone = computed<boolean>(() => this.asideService.isVisible());
}
