import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-all-address-home',
    templateUrl: './all-address-home.component.html',
    styleUrls: ['./all-address-home.component.scss'],
    standalone: false
})
export class AllAddressHomeComponent implements OnInit {
  @Input() isClient: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
  constructor() {}

  ngOnInit(): void {
    window.addEventListener('scroll', this.scroll, true);
  }

  private scroll = (event: any): void => {
    // const navAddress = document.getElementById('nav');
    // const newpos = Math.round(944 - event.srcElement.scrollLeft);
    // this.renderer.setStyle(navAddress, 'left',  newpos.toString() );
    // const top = event.srcElement.scrollLeft;
    // console.log(event.srcElement.scrollLeft, newpos +'px');
  };
}
