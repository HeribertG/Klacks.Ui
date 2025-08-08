import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  private _showProgressSpinner = false;

  get showProgressSpinner(): boolean {
    return this._showProgressSpinner;
  }

  set showProgressSpinner(value: boolean) {
    this._showProgressSpinner = value;
  }
}
