import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuestionMarkRoundComponent } from 'src/app/icons/icon-round-question_mark.component';

@Component({
  selector: 'app-message-window',
  templateUrl: './message-window.component.html',
  styleUrls: ['./message-window.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, QuestionMarkRoundComponent],
})
export class MessageWindowComponent {
  @Input() title = 'Message';
  @Input() message: string = '';
  constructor(private translateService: TranslateService) {}

  ngOnInit(): void {
    this.translateService.get('message').subscribe((x) => {
      this.title = x;
    });
  }
}
