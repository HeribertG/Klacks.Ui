import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-message-window',
  templateUrl: './message-window.component.html',
  styleUrls: ['./message-window.component.scss'],
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
