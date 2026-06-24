// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for reviewing the emergent skill-relationship graph Klacksy has learned.
 * Lists each insight (two related skills, type, confidence, support/contradiction) and lets an admin accept or dismiss it.
 * @param relations - Skill relations from the backend, already sorted by confidence (highest first)
 * @param isLoading - True while relations are being loaded
 * @param processingRelationId - Set while one relation is being accepted/dismissed
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SkillRelationService } from 'src/app/domain/services/assistant/skill-relation.service';
import { ISkillRelation } from 'src/app/domain/models/assistant/skill-relation.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

@Component({
  selector: 'app-assistant-skill-relations',
  templateUrl: './assistant-skill-relations.component.html',
  styleUrls: ['./assistant-skill-relations.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSkillRelationsComponent implements OnInit {
  private skillRelationService = inject(SkillRelationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly relations = signal<ISkillRelation[]>([]);
  readonly isLoading = signal(false);
  readonly processingRelationId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRelations();
  }

  loadRelations(): void {
    this.isLoading.set(true);
    this.skillRelationService.getAll().subscribe({
      next: (relations) => {
        this.relations.set(relations ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.relations.set([]);
        this.isLoading.set(false);
        this.showError('setting.skillRelations.error.load');
      },
    });
  }

  confidencePercent(relation: ISkillRelation): number {
    return Math.round(relation.confidence * 100);
  }

  async onAccept(relation: ISkillRelation): Promise<void> {
    if (this.processingRelationId() !== null) {
      return;
    }
    this.processingRelationId.set(relation.id);
    try {
      const updated = await firstValueFrom(this.skillRelationService.accept(relation.id));
      this.replaceRelation(updated);
      this.showInfo('setting.skillRelations.info.accepted', {
        skillA: updated.skillAName,
        skillB: updated.skillBName,
      });
    } catch {
      this.showError('setting.skillRelations.error.acceptFailed');
    } finally {
      this.processingRelationId.set(null);
    }
  }

  async onDismiss(relation: ISkillRelation): Promise<void> {
    if (this.processingRelationId() !== null) {
      return;
    }
    this.processingRelationId.set(relation.id);
    try {
      const updated = await firstValueFrom(this.skillRelationService.dismiss(relation.id));
      this.replaceRelation(updated);
      this.showInfo('setting.skillRelations.info.dismissed', {
        skillA: updated.skillAName,
        skillB: updated.skillBName,
      });
    } catch {
      this.showError('setting.skillRelations.error.dismissFailed');
    } finally {
      this.processingRelationId.set(null);
    }
  }

  private replaceRelation(updated: ISkillRelation): void {
    this.relations.update((list) =>
      list.map((relation) => (relation.id === updated.id ? updated : relation)),
    );
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
