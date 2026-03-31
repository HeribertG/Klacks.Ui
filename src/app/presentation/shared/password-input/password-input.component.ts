// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reusable password/secret input with show/hide toggle button.
 * @param value - Two-way bound input value
 * @param inputId - HTML id attribute for the input element
 * @param placeholder - Optional placeholder text
 * @param autocomplete - HTML autocomplete attribute (default: 'current-password')
 * @param inputClass - Additional CSS class for the input element
 */
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-password-input',
  templateUrl: './password-input.component.html',
  styleUrls: ['./password-input.component.scss'],
  standalone: true,
  imports: [FormsModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordInputComponent {
  value = model<string>('');
  inputId = input<string>('password-input');
  placeholder = input<string>('');
  autocomplete = input<string>('current-password');
  inputClass = input<string>('');

  showPassword = false;

  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
}
