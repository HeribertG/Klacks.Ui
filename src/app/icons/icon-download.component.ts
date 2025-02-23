import { Component, OnInit } from '@angular/core';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'icon-download',
    styleUrls: ['./buttons.scss'],
    template: `
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20" fill="white">
  <path d="M17 12v5H3v-5H1v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/>
  <path d="M10 15l5-6h-4V1H9v8H5l5 6z"/>
</svg>`,
    standalone: false
})
export class IconDownloadComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
