// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal body for delete and confirmation dialogs showing a title, warning icon and message.
 * @param title - Translation key for the modal header title (default: 'delete')
 * @param message - Plain text shown in the modal body
 */
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AttentionGreyComponent } from 'src/app/presentation/icons/attention-icon-grey.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-deletewindow',
  templateUrl: './deletewindow.component.html',
  styleUrl: './deletewindow.component.scss',
  standalone: true,
  imports: [TranslateModule, AttentionGreyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletewindowComponent {
  title = input('delete');
  message = input('');

  public activeModal = inject(NgbActiveModal, { optional: true });
}
