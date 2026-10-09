/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { isOtpCharacter, otpCharacters, type OtpInputMode } from '@seamless-auth/client';
import { computed, defineComponent, h, type PropType } from 'vue';

/** One box per character of a one-time code. Bind the code with `v-model`. */
export const SaOtpInput = defineComponent({
  name: 'SaOtpInput',
  props: {
    modelValue: { type: String, default: '' },
    length: { type: Number, default: 6 },
    mode: { type: String as PropType<OtpInputMode>, default: 'numeric' },
    name: { type: String, default: 'otp' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const boxes: (HTMLInputElement | null)[] = [];

    const chars = computed(() =>
      Array.from({ length: props.length }, (_, i) => props.modelValue[i] ?? '')
    );

    const focus = (index: number) => boxes[index]?.focus();
    const write = (next: string[]) => emit('update:modelValue', next.join(''));

    const fill = (index: number, input: string) => {
      const incoming = otpCharacters(input, props.mode).slice(0, props.length);
      const next = [...chars.value];

      incoming.forEach((char, offset) => {
        if (index + offset < next.length) next[index + offset] = char;
      });

      write(next);
      focus(Math.min(index + incoming.length, props.length - 1));
    };

    const onInput = (index: number, event: Event) => {
      const box = event.target as HTMLInputElement;
      const typed = box.value;

      if (typed.length > 1) {
        fill(index, typed);
        return;
      }

      if (typed && !isOtpCharacter(typed, props.mode)) {
        // The value only flows down, so a refused character has to be taken
        // back out of the element itself.
        box.value = chars.value[index];
        return;
      }

      const next = [...chars.value];
      next[index] = typed;
      write(next);

      if (typed) focus(index + 1);
    };

    const onKeydown = (index: number, event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        event.preventDefault();
        const next = [...chars.value];

        if (next[index]) {
          next[index] = '';
          write(next);
        } else if (index > 0) {
          next[index - 1] = '';
          write(next);
          focus(index - 1);
        }
      }

      if (event.key === 'ArrowLeft' && index > 0) focus(index - 1);
      if (event.key === 'ArrowRight' && index < props.length - 1) focus(index + 1);
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      fill(0, event.clipboardData?.getData('text') ?? '');
    };

    return () =>
      h(
        'div',
        {
          class: 'sa-otp',
          role: 'group',
          'aria-label': 'One-time password input',
          onPaste,
        },
        chars.value.map((char, i) =>
          h('input', {
            key: i,
            ref: (el: unknown) => {
              boxes[i] = el as HTMLInputElement | null;
            },
            class: 'sa-otp-input',
            type: 'text',
            inputmode: props.mode === 'numeric' ? 'numeric' : 'text',
            autocomplete: 'one-time-code',
            name: `${props.name}-${i}`,
            maxlength: 1,
            value: char,
            'aria-label': `Digit ${i + 1}`,
            onInput: (event: Event) => onInput(i, event),
            onKeydown: (event: KeyboardEvent) => onKeydown(i, event),
          })
        )
      );
  },
});
