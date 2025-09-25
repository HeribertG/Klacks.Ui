import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttentionGreyComponent } from 'src/app/presentation/icons/attention-icon-grey.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

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
  
  activeModal = inject(NgbActiveModal);
  private translateService = inject(TranslateService);
}
