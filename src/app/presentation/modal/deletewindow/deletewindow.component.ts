// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { Component, Input, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AttentionGreyComponent } from 'src/app/presentation/icons/attention-icon-grey.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-deletewindow',
  templateUrl: './deletewindow.component.html',
  styleUrls: ['./deletewindow.component.scss'],
  standalone: true,
  imports: [TranslateModule, AttentionGreyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletewindowComponent {
  @Input() title = 'delete';
  @Input() message = '';

  public activeModal = inject(NgbActiveModal, { optional: true });
}
