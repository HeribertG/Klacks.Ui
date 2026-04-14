// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-klacksy-training-synonym-editor',
  standalone: true,
  template: '<p>Synonym editor (Task 24) for {{target?.targetId}} / {{locale}}</p>'
})
export class KlacksyTrainingSynonymEditorComponent {
  @Input() target: any;
  @Input() locale = '';
  @Output() saved = new EventEmitter<void>();
}
