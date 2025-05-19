import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AllAddressNavComponent } from '../all-address-nav/all-address-nav.component';
import { AllAddressListComponent } from '../all-address-list/all-address-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-all-address-home',
  templateUrl: './all-address-home.component.html',
  styleUrls: ['./all-address-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllAddressListComponent,
    AllAddressNavComponent,
  ],
})
export class AllAddressHomeComponent {
  @Input() isClient = false;
  @Output() isChangingEvent = new EventEmitter();
}
