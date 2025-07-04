import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-dashboard',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="32"
      height="32"
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="227"
        height="256"
        fill="black"
        fill-opacity="0"
        transform="translate(14)"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M165.124 87.9908L223.901 29.1758L240.726 45.9988L181.948 104.814L165.124 87.9908ZM141.307 148.095C129.804 148.095 120.485 138.735 120.485 127.177C120.485 115.631 129.804 106.259 141.307 106.259C152.81 106.259 162.129 115.631 162.129 127.177C162.129 138.735 152.81 148.095 141.307 148.095ZM241 208.845L224.176 225.68L165.398 166.864L182.223 150.029L241 208.845Z"
        fill="#222222"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M141.913 217.637C153.761 217.637 165.049 215.273 175.395 211.07L204.103 239.81C185.692 250.089 164.5 256 141.913 256C71.2745 256 14 198.689 14 128.006C14 57.3107 71.2745 0 141.913 0C164.274 0 185.275 5.76691 203.554 15.8561L175.323 44.1173C164.99 39.9384 153.738 37.5743 141.913 37.5743C92.4422 37.5743 52.3381 77.8829 52.3381 127.612C52.3381 177.328 92.4422 217.637 141.913 217.637Z"
        fill="#03A9F4"
      />
    </svg>
  `,
  styles: [''],
  standalone: true,
})
export class IconDashboardComponent {
  constructor() {}
}
