// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal body for message dialogs showing a title, question-mark icon and message text.
 * @param title - Translation key for the modal header title (default: 'message')
 * @param message - Plain text shown in the modal body
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionMarkRoundComponent } from 'src/app/presentation/icons/icon-round-question_mark.component';

@Component({
  selector: 'app-message-window',
  templateUrl: './message-window.component.html',
  styleUrl: './message-window.component.scss',
  standalone: true,
  imports: [TranslateModule, QuestionMarkRoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageWindowComponent {
  title = input('message');
  message = input('');
}
