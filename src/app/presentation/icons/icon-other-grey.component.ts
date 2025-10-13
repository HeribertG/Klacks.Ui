import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-other-grey',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <g
      id="Stockholm-icons-/-General-/-Other2"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <rect id="bound" x="0" y="0" width="24" height="24"></rect>
      <circle id="Oval-67" fill="rgb(70, 78, 95)" cx="5" cy="12" r="2"></circle>
      <circle
        id="Oval-67-Copy"
        fill="rgb(70, 78, 95)"
        cx="12"
        cy="12"
        r="2"
      ></circle>
      <circle
        id="Oval-67-Copy-2"
        fill="rgb(70, 78, 95)"
        cx="19"
        cy="12"
        r="2"
      ></circle>
    </g>
  </svg>`,
  standalone: true,
})
export class OtherGreyComponent {}
