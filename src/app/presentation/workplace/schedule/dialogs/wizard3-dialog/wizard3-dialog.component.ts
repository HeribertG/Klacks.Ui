// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Placeholder dialog for the planned Wizard 3 (LLM-driven schedule harmonizer).
 * The LLM layer is not yet implemented; this dialog shows the architecture summary
 * and the currently selected LLM model from app settings.
 */

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-wizard3-dialog',
  templateUrl: './wizard3-dialog.component.html',
  styleUrls: ['./wizard3-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wizard3DialogComponent {
  @ViewChild('wizard3Modal') modalTemplate!: TemplateRef<unknown>;

  private readonly ngbModal = inject(NgbModal);
  private readonly appSettings = inject(AppSettingsManagementService);
  private modalRef: NgbModalRef | null = null;

  readonly selectedLlmModelId = computed(() => this.appSettings.wizard3Settings().llmModelId);

  open(): void {
    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
    });
  }

  close(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }
}
