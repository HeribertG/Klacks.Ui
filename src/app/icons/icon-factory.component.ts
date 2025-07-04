import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-factory',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24"
    width="24"
    viewBox="0 0 500 500"
  >
    <path
      d="M 70,320 V 440 H 430 V 250 L 310,320 V 250 L 190,320 V 250 L 143,277 140,150 H 91 L 85,311 Z"
      fill="#000"
    />
    <path
      d="M 100,155 C 80,130 85,90 125,95 C 130,50 150,35 195,50 C 215,15 250,10 290,35 C 325,0 407.5,5 407.5,75 C 410,145 330,160 285,120 C 255,150 230,150 190,125 C 170,145 160,145 140,135 C 140,140 135,145 125,155"
      stroke="#000"
      stroke-width="15"
      fill="none"
      stroke-linejoin="round"
    />
  </svg>`,
  standalone: true,
})
export class IconFactoryComponent {}
