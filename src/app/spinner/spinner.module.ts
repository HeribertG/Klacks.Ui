import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from './spinner.component';
import { SpinnerWrapperComponent } from './spinner-wrapper/spinner-wrapper.component';

@NgModule({
  declarations: [SpinnerComponent, SpinnerWrapperComponent],
  imports: [CommonModule],
  exports: [SpinnerComponent, SpinnerWrapperComponent],
})
export class SpinnerModule {}
