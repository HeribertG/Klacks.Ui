import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';

@Component({
  selector: 'app-schedule-template-select',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ 'report.selectTemplate' | translate }}</h5>
      <button type="button" class="btn-close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="list-group">
        @for (template of templates; track template.id) {
          <button
            type="button"
            class="list-group-item list-group-item-action"
            (click)="select(template)"
          >
            <strong>{{ template.name }}</strong>
            @if (template.description) {
              <br><small class="text-muted">{{ template.description }}</small>
            }
          </button>
        }
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">
        {{ 'general.cancel' | translate }}
      </button>
    </div>
  `,
})
export class ScheduleTemplateSelectComponent {
  @Input() templates: ReportTemplate[] = [];

  activeModal = inject(NgbActiveModal);

  select(template: ReportTemplate): void {
    this.activeModal.close(template);
  }
}
