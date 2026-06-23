// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component for a single qualification entry in the settings list.
 * @param data - The qualification to display
 */
import { Component, ChangeDetectionStrategy, input, output, OnInit, inject } from '@angular/core';
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
  readonly data = input.required<IQualification>();
  readonly editEvent = output<IQualification>();
  readonly isDeleteEvent = output<IQualification>();

  private translate = inject(TranslateService);
  currentLang = 'de';

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? 'de';
  }

  getDisplayName(): string {
    return getLocalizedValue(this.data()?.name, this.currentLang);
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }
}
