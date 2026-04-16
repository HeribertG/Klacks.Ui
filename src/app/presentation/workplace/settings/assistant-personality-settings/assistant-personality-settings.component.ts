// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for editing Klacksy personality soul sections of the default agent.
 * @param fields - Editable soul section textareas (identity, personality, tone, boundaries, communication style, values)
 * @param isLoading - True while the default agent and its soul sections are being loaded
 * @param isSaving - True while a section upsert is in flight
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataAgentService } from 'src/app/infrastructure/api/assistant/data-agent.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SoulSectionTypes } from 'src/app/domain/constants/soul-section-types';

interface SectionField {
  readonly key: string;
  readonly labelKey: string;
  readonly hintKey: string;
  content: string;
  initialContent: string;
}

@Component({
  selector: 'app-assistant-personality-settings',
  templateUrl: './assistant-personality-settings.component.html',
  styleUrls: ['./assistant-personality-settings.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPersonalitySettingsComponent implements OnInit {
  private dataAgentService = inject(DataAgentService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  private agentId: string | null = null;

  readonly fields: SectionField[] = [
    {
      key: SoulSectionTypes.Identity,
      labelKey: 'setting.personality.identity',
      hintKey: 'setting.personality.identity-hint',
      content: '',
      initialContent: '',
    },
    {
      key: SoulSectionTypes.Personality,
      labelKey: 'setting.personality.personality',
      hintKey: 'setting.personality.personality-hint',
      content: '',
      initialContent: '',
    },
    {
      key: SoulSectionTypes.Tone,
      labelKey: 'setting.personality.tone',
      hintKey: 'setting.personality.tone-hint',
      content: '',
      initialContent: '',
    },
    {
      key: SoulSectionTypes.Boundaries,
      labelKey: 'setting.personality.boundaries',
      hintKey: 'setting.personality.boundaries-hint',
      content: '',
      initialContent: '',
    },
    {
      key: SoulSectionTypes.CommunicationStyle,
      labelKey: 'setting.personality.communication-style',
      hintKey: 'setting.personality.communication-style-hint',
      content: '',
      initialContent: '',
    },
    {
      key: SoulSectionTypes.Values,
      labelKey: 'setting.personality.values',
      hintKey: 'setting.personality.values-hint',
      content: '',
      initialContent: '',
    },
  ];

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const agents = await firstValueFrom(this.dataAgentService.getAll());
      const defaultAgent = agents.find((a) => a.isDefault) ?? agents[0];
      if (!defaultAgent) {
        this.isLoading.set(false);
        return;
      }
      this.agentId = defaultAgent.id;

      const sections = await firstValueFrom(
        this.dataAgentService.getSoulSections(this.agentId),
      );
      for (const field of this.fields) {
        const existing = sections.find(
          (s) => s.sectionType === field.key && s.isActive,
        );
        const content = existing?.content ?? '';
        field.content = content;
        field.initialContent = content;
      }
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('setting.personality.load-failed'),
        this.translateService.instant('setting.personality.headline'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onFieldBlur(field: SectionField): Promise<void> {
    if (!this.agentId) {
      return;
    }
    if (field.content === field.initialContent) {
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.dataAgentService.upsertSoulSection(this.agentId, field.key, {
          content: field.content,
        }),
      );
      field.initialContent = field.content;
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('setting.personality.save-failed'),
        this.translateService.instant('setting.personality.headline'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
