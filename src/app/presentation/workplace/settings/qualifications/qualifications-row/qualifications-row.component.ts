// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component for a single qualification entry in the settings list.
 * @param data - The qualification to display
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';

@Component({
  selector: 'app-qualifications-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './qualifications-row.component.html',
  styleUrls: ['./qualifications-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationsRowComponent implements OnInit {
  @Input() data!: IQualification;
  @Output() editEvent = new EventEmitter<IQualification>();
  @Output() isDeleteEvent = new EventEmitter<IQualification>();

  private translate = inject(TranslateService);
  currentLang = 'de';

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? 'de';
  }

  getDisplayName(): string {
    return getLocalizedValue(this.data?.name, this.currentLang);
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data);
  }
}
