import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-icon-user',
  styleUrls: ['./buttons.scss'],
  template: ` <svg
    version="1.2"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    overflow="visible"
    preserveAspectRatio="none"
    viewBox="0 0 26 26"
    height="24"
    width="24"
  >
    <g transform="translate(1, 1)">
      <desc>Created with Sketch.</desc>
      <defs />
      <g
        fill-rule="evenodd"
        fill="none"
        stroke-width="1"
        stroke="none"
        id="Stockholm-icons-/-General-/-User_1589466893627"
      >
        <polygon
          points="0 0 24 0 24 24 0 24"
          id="Shape_1589466893627"
          vector-effect="non-scaling-stroke"
        />
        <path
          opacity="0.3"
          fill-rule="nonzero"
          fill="var(--iconBlackColor)"
          id="Mask_1589466893627"
          d="M12,11 C9.790861,11 8,9.209139 8,7 C8,4.790861 9.790861,3 12,3 C14.209139,3 16,4.790861 16,7 C16,9.209139 14.209139,11 12,11 Z"
          vector-effect="non-scaling-stroke"
        />
        <path
          fill-rule="nonzero"
          fill="var(--iconBlackColor)"
          id="Mask-Copy_1589466893627"
          d="M3.00065168,20.1992055 C3.38825852,15.4265159 7.26191235,13 11.9833413,13 C16.7712164,13 20.7048837,15.2931929 20.9979143,20.2 C21.0095879,20.3954741 20.9979143,21 20.2466999,21 C16.541124,21 11.0347247,21 3.72750223,21 C3.47671215,21 2.97953825,20.45918 3.00065168,20.1992055 Z"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </g>
  </svg>`,
  standalone: true,
})
export class IconUserComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
