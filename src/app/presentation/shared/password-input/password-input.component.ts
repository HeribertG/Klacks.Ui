// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reusable password/secret input with show/hide toggle button.
 * @param value - Two-way bound input value
 * @param inputId - HTML id attribute for the input element
 * @param placeholder - Optional placeholder text
 * @param autocomplete - HTML autocomplete attribute (default: 'current-password')
 * @param inputClass - Additional CSS class for the input element
 * @param describedBy - Optional ids of the elements that describe the input (rules, inline errors)
 * @param invalid - Marks the input as invalid for assistive technology
 * @param required - Marks the input as required for assistive technology
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
  describedBy = input<string | null>(null);
  invalid = input<boolean>(false);
  required = input<boolean>(false);

  showPassword = false;

  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
}
