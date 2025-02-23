import { Component, OnInit, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-deletewindow',
    templateUrl: './deletewindow.component.html',
    styleUrls: ['./deletewindow.component.scss'],
    standalone: false
})
export class DeletewindowComponent implements OnInit {
  @Input() title = 'Löschen';
  @Input() message: string = '';

  constructor(private translateService: TranslateService) {}

  ngOnInit(): void {}
}
