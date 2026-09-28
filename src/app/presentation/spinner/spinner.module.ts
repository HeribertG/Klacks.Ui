// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NgModule } from '@angular/core';
import { SpinnerComponent } from './spinner.component';
import { SpinnerWrapperComponent } from './spinner-wrapper/spinner-wrapper.component';

@NgModule({
  imports: [SpinnerComponent, SpinnerWrapperComponent],
  exports: [SpinnerComponent, SpinnerWrapperComponent],
})
export class SpinnerModule {}
