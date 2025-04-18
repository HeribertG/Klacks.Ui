import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-add',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="24"
      height="24"
    >
      <defs>
        <!-- Filter für den Emboss-Effekt -->
        <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="2"
            specularConstant="0.75"
            specularExponent="20"
            lighting-color="white"
            result="specOut"
          >
            <fePointLight x="-5000" y="-10000" z="20000" />
          </feSpecularLighting>
          <feComposite
            in="specOut"
            in2="SourceAlpha"
            operator="in"
            result="specOut"
          />
          <feComposite
            in="SourceGraphic"
            in2="specOut"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
          />
        </filter>
      </defs>

      <!-- Herhabenes Viereck in Grün -->
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="8"
        ry="8"
        fill="green"
        stroke="black"
        stroke-width="2"
        filter="url(#emboss)"
      />

      <!-- Plus-Zeichen (Add) in Weiß -->
      <!-- Horizontale Linie -->
      <rect x="20" y="29" width="24" height="6" fill="white" />
      <!-- Vertikale Linie -->
      <rect x="29" y="20" width="6" height="24" fill="white" />
    </svg>
  `,
  standalone: true,
})
export class IconAddComponent {}
