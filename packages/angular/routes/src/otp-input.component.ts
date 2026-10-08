/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { isOtpCharacter, otpCharacters, type OtpInputMode } from '@seamless-auth/client';

/** One box per character of a one-time code. Bind the code with `[(value)]`. */
@Component({
  selector: 'sa-otp-input',
  template: `
    <div
      class="sa-otp"
      role="group"
      aria-label="One-time password input"
      (paste)="onPaste($event)"
    >
      @for (char of chars(); track $index) {
        <input
          #box
          class="sa-otp-input"
          type="text"
          [attr.inputmode]="mode() === 'numeric' ? 'numeric' : 'text'"
          autocomplete="one-time-code"
          [name]="name() + '-' + $index"
          maxlength="1"
          [value]="char"
          [attr.aria-label]="'Digit ' + ($index + 1)"
          (input)="onInput($index, $event)"
          (keydown)="onKeydown($index, $event)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaOtpInput {
  readonly value = model('');
  readonly length = input(6);
  readonly mode = input<OtpInputMode>('numeric');
  readonly name = input('otp');

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  readonly chars = computed(() =>
    Array.from({ length: this.length() }, (_, i) => this.value()[i] ?? '')
  );

  private focus(index: number) {
    this.boxes()[index]?.nativeElement.focus();
  }

  private write(chars: string[]) {
    this.value.set(chars.join(''));
  }

  onInput(index: number, event: Event) {
    const box = event.target as HTMLInputElement;
    const typed = box.value;

    if (typed.length > 1) {
      this.fill(index, typed);
      return;
    }

    if (typed && !isOtpCharacter(typed, this.mode())) {
      // The box is not bound two ways, so a refused character has to be taken
      // back out of the element itself.
      box.value = this.chars()[index];
      return;
    }

    const chars = [...this.chars()];
    chars[index] = typed;
    this.write(chars);

    if (typed) {
      this.focus(index + 1);
    }
  }

  onKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const chars = [...this.chars()];

      if (chars[index]) {
        chars[index] = '';
        this.write(chars);
      } else if (index > 0) {
        chars[index - 1] = '';
        this.write(chars);
        this.focus(index - 1);
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      this.focus(index - 1);
    }

    if (event.key === 'ArrowRight' && index < this.length() - 1) {
      this.focus(index + 1);
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    this.fill(0, event.clipboardData?.getData('text') ?? '');
  }

  private fill(index: number, input: string) {
    const incoming = otpCharacters(input, this.mode()).slice(0, this.length());
    const chars = [...this.chars()];

    incoming.forEach((char, offset) => {
      if (index + offset < chars.length) {
        chars[index + offset] = char;
      }
    });

    this.write(chars);
    this.focus(Math.min(index + incoming.length, this.length() - 1));
  }
}
