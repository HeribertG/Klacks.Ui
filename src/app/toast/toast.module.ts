import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastsContainer } from './toast.component';

@NgModule({
  declarations: [ToastsContainer],
  imports: [CommonModule, NgbModule],
  exports: [ToastsContainer],
})
export class ToastModule {}
