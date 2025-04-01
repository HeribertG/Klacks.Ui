import { Component } from '@angular/core';

@Component({
  selector: 'icon-slider-grey',
  styleUrls: ['./buttons.scss'],
  template: ` <svg
    style="margin-top: -5px; margin-left: -4px; "
    version="1.2"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    overflow="visible"
    preserveAspectRatio="none"
    viewBox="0 0 512 512"
    width="16"
    height="16"
  >
    <g>
      fill-rule="evenodd" clip-rule="evenodd"
      <path
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        d="M319.3,102.6c0-8.7,1.6-17.3,3.1-26H0v51.1h322.5C320.9,119.9,319.3,111.3,319.3,102.6z"
      />
      <path
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        d="M319.3,409.4c0-8.7,1.6-17.3,3.1-26H0v51.1h322.5C320.9,426.7,319.3,418,319.3,409.4z"
      />
      <path
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        d="M63.7,256c0-8.7,1.6-17.3,3.1-26H0v51.1h66.9C65.3,273.3,63.7,264.7,63.7,256z"
      />
      <path
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        d="M291,230.8c1.6,7.9,3.1,16.5,3.1,26c0,9.4-1.6,17.3-3.1,26h220.2v-51.1H291V230.8z"
      />
      <circle
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        cx="434.9"
        cy="102.6"
        r="77.1"
      />
      <circle
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        cx="179.3"
        cy="256"
        r="77.1"
      />
      <circle
        stroke="var(--iconBlackColor)"
        fill="var(--iconBlackColor)"
        cx="434.9"
        cy="409.4"
        r="77.1"
      />
      vector-effect="non-scaling-stroke" />
    </g>
  </svg>`,
  standalone: true,
})
export class SliderGreyComponent {
  constructor() {}
}
