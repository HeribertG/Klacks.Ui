import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttentionGreyComponent } from 'src/app/icons/attention-icon-grey.component';

@Component({
  selector: 'app-deletewindow',
  templateUrl: './deletewindow.component.html',
  styleUrls: ['./deletewindow.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, AttentionGreyComponent],
})
export class DeletewindowComponent {
  @Input() title = 'Löschen';
  @Input() message = '';

  constructor(private translateService: TranslateService) {}
}
