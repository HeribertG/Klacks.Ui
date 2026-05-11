// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for reviewing Klacksy skill-description proposals (Agent C output).
 * Lists pending proposals with a before/after diff and lets admins approve, reject, or trigger generation.
 * @param proposals - Pending ProposedSkillChange entries from the backend
 * @param isLoading - True while pending proposals are being loaded
 * @param isGenerating - True while Agent C generation is in flight
 * @param processingProposalId - Set while one proposal is being approved/rejected
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IProposedSkillChange } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

@Component({
  selector: 'app-assistant-skill-proposals',
  templateUrl: './assistant-skill-proposals.component.html',
  styleUrls: ['./assistant-skill-proposals.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSkillProposalsComponent implements OnInit {
  private readonly defaultTrajectoryWindow = 30;

  private assistantService = inject(DataManagementAssistantService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly proposals = signal<IProposedSkillChange[]>([]);
  readonly isLoading = signal(false);
  readonly isGenerating = signal(false);
  readonly processingProposalId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProposals();
  }

  loadProposals(): void {
    this.isLoading.set(true);
    this.assistantService.getPendingSkillProposals().subscribe({
      next: (proposals) => {
        this.proposals.set(proposals ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.proposals.set([]);
        this.isLoading.set(false);
        this.showError('setting.skillProposals.error.load');
      },
    });
  }

  async onGenerateClick(): Promise<void> {
    if (this.isGenerating()) return;
    this.isGenerating.set(true);
    try {
      const response = await firstValueFrom(
        this.assistantService.generateSkillProposals(this.defaultTrajectoryWindow),
      );
      this.showInfo('setting.skillProposals.info.generated', { count: response.generated });
      this.loadProposals();
    } catch {
      this.showError('setting.skillProposals.error.generate');
    } finally {
      this.isGenerating.set(false);
    }
  }

  parseEvidence(proposal: IProposedSkillChange): string[] {
    try {
      const parsed = JSON.parse(proposal.evidenceJson);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  async onApprove(proposal: IProposedSkillChange): Promise<void> {
    if (this.processingProposalId() !== null) return;
    this.processingProposalId.set(proposal.id);
    try {
      const result = await firstValueFrom(this.assistantService.approveSkillProposal(proposal.id));
      if (result.applied) {
        this.proposals.update((list) => list.filter((p) => p.id !== proposal.id));
        this.showInfo('setting.skillProposals.info.approved', { name: proposal.skillName });
      } else {
        this.showError('setting.skillProposals.error.approveFailed');
      }
    } catch {
      this.showError('setting.skillProposals.error.approveFailed');
    } finally {
      this.processingProposalId.set(null);
    }
  }

  async onReject(proposal: IProposedSkillChange): Promise<void> {
    if (this.processingProposalId() !== null) return;
    this.processingProposalId.set(proposal.id);
    try {
      const result = await firstValueFrom(this.assistantService.rejectSkillProposal(proposal.id));
      if (result.rejected) {
        this.proposals.update((list) => list.filter((p) => p.id !== proposal.id));
        this.showInfo('setting.skillProposals.info.rejected', { name: proposal.skillName });
      } else {
        this.showError('setting.skillProposals.error.rejectFailed');
      }
    } catch {
      this.showError('setting.skillProposals.error.rejectFailed');
    } finally {
      this.processingProposalId.set(null);
    }
  }

  private showInfo(key: string, params?: Record<string, unknown>): void {
    const message = this.translateService.instant(key, params);
    this.toastShowService.showSuccess(message, '');
  }

  private showError(key: string): void {
    const message = this.translateService.instant(key);
    this.toastShowService.showError(message);
  }
}
