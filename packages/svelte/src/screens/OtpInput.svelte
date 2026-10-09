<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- One box per character of a one-time code. Bind the code with bind:value. -->
<script lang="ts">
  import { isOtpCharacter, otpCharacters, type OtpInputMode } from '@seamless-auth/client';

  let {
    value = $bindable(''),
    length = 6,
    mode = 'numeric',
    name = 'otp',
  }: { value?: string; length?: number; mode?: OtpInputMode; name?: string } = $props();

  const boxes: (HTMLInputElement | undefined)[] = $state([]);
  const chars = $derived(Array.from({ length }, (_, i) => value[i] ?? ''));

  const focus = (index: number) => boxes[index]?.focus();
  const write = (next: string[]) => {
    value = next.join('');
  };

  function fill(index: number, input: string) {
    const incoming = otpCharacters(input, mode).slice(0, length);
    const next = [...chars];

    incoming.forEach((char, offset) => {
      if (index + offset < next.length) next[index + offset] = char;
    });

    write(next);
    focus(Math.min(index + incoming.length, length - 1));
  }

  function onInput(index: number, event: Event) {
    const box = event.currentTarget as HTMLInputElement;
    const typed = box.value;

    if (typed.length > 1) {
      fill(index, typed);
      return;
    }

    if (typed && !isOtpCharacter(typed, mode)) {
      // The value only flows down, so a refused character has to be taken back
      // out of the element itself.
      box.value = chars[index];
      return;
    }

    const next = [...chars];
    next[index] = typed;
    write(next);

    if (typed) focus(index + 1);
  }

  function onKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...chars];

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
    if (event.key === 'ArrowRight' && index < length - 1) focus(index + 1);
  }

  function onPaste(event: ClipboardEvent) {
    event.preventDefault();
    fill(0, event.clipboardData?.getData('text') ?? '');
  }
</script>

<div class="sa-otp" role="group" aria-label="One-time password input" onpaste={onPaste}>
  {#each chars as char, i (i)}
    <input
      bind:this={boxes[i]}
      class="sa-otp-input"
      type="text"
      inputmode={mode === 'numeric' ? 'numeric' : 'text'}
      autocomplete="one-time-code"
      name={`${name}-${i}`}
      maxlength="1"
      value={char}
      aria-label={`Digit ${i + 1}`}
      oninput={event => onInput(i, event)}
      onkeydown={event => onKeydown(i, event)}
    />
  {/each}
</div>
