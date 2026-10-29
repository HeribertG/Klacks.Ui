// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy section of the expert settings page: the rows with the speech, whisper plugin, personality, learning,
 * skill-relation, autonomy and proactive-governance cards of the assistant.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { AssistantSpeechSettingsComponent } from '../../assistant-speech-settings/assistant-speech-settings.component';
import { WhisperPluginSettingComponent } from '../../whisper-plugin-setting/whisper-plugin-setting.component';
import { AssistantPersonalitySettingsComponent } from '../../assistant-personality-settings/assistant-personality-settings.component';
import { AssistantLearningComponent } from '../../assistant-learning/assistant-learning.component';
import { AssistantSkillRelationsComponent } from '../../assistant-skill-relations/assistant-skill-relations.component';
import { KlacksyAutonomySettingsComponent } from '../../klacksy-autonomy-settings/klacksy-autonomy-settings.component';
import { KlacksyProactiveGovernanceComponent } from '../../klacksy-proactive-governance/klacksy-proactive-governance.component';

@Component({
  selector: 'app-settings-klacksy-section',
  templateUrl: './settings-klacksy-section.component.html',
  styleUrl: './settings-klacksy-section.component.scss',
  standalone: true,
  imports: [
    AssistantSpeechSettingsComponent,
    WhisperPluginSettingComponent,
    AssistantPersonalitySettingsComponent,
    AssistantLearningComponent,
    AssistantSkillRelationsComponent,
    KlacksyAutonomySettingsComponent,
    KlacksyProactiveGovernanceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsKlacksySectionComponent {
  protected readonly playground = inject(PlaygroundDeviceService);
}
