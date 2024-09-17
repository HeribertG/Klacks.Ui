import { Component, OnInit } from '@angular/core';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'icon-pdf-icon',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 31 38"
    >
      <path
        d="M4.1 37.47a.58.58 0 0 1-.57-.57V1.1A.58.58 0 0 1 4.1.53h17.53l8.84 8.67v27.7a.58.58 0 0 1-.57.57z"
        fill="#d9d9d9"
      />
      <path
        d="M21.41 1.07l8.52 8.35v27.51H4.1V1.1h17.31m.44-1.1H4.1A1.1 1.1 0 0 0 3 1.1v35.8A1.1 1.1 0 0 0 4.1 38h25.8a1.1 1.1 0 0 0 1.1-1.1V9l-9.15-9z"
        fill="#878787"
      />
      <path d="M30.5 9.5h-8.36A1.14 1.14 0 0 1 21 8.36V0z" fill="#878787" />
      <rect y="20" width="25" height="12" rx=".96" ry=".96" fill="#c90000" />
      <path
        d="M5 23h2.25c1.35 0 2.5.48 2.5 2s-1.17 2.1-2.46 2.1h-.66V29H5zm2.21 2.84c.65 0 .95-.32.95-.85s-.36-.74-1-.74h-.53v1.59zM10.63 23h1.72a2.66 2.66 0 0 1 3 3 2.67 2.67 0 0 1-2.9 3h-1.8zm1.63 4.71c.84 0 1.5-.34 1.5-1.74s-.66-1.7-1.5-1.7h-.09v3.44zM16.48 23h4v1.33H18.1v1.14h2v1.32h-2V29h-1.62z"
        fill="#fff"
      />
    </svg>
  `,
  styles: [''],
})
export class PdfIconComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
