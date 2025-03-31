import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-all-address-home',
  templateUrl: './all-address-home.component.html',
  styleUrls: ['./all-address-home.component.scss'],
  standalone: false,
})
export class AllAddressHomeComponent {
  @Input() isClient: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
}
