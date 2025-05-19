import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-button-new',
  templateUrl: './button-new.component.html',
  styleUrls: ['./button-new.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ButtonNewComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
