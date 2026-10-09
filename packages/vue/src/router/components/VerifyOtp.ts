/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  formatCountdown,
  OTP_LENGTH,
  OTP_LIFETIME_SECONDS,
  otpResendFailedMessage,
  requestOtp,
  verifyOtp,
  type OtpChannel,
} from '@seamless-auth/client';
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type PropType,
} from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';
import { SaOtpInput } from './OtpInput';

const COPY = {
  email: {
    title: 'Verify Your Email',
    subtitle: 'We sent you a verification email. Enter the code below.',
    label: 'Email Verification Code',
    resend: 'Resend code to email',
    resent: 'Verification email has been resent.',
  },
  phone: {
    title: 'Verify Your Phone Number',
    subtitle: 'Enter the code sent to your phone number.',
    label: 'Phone Verification Code',
    resend: 'Resend code to phone',
    resent: 'Verification SMS has been resent.',
  },
} as const;

/**
 * Checks a one-time code sent by email or text message. The previous screen's
 * navigation state says whether this is a sign-in (`flow: 'login'`) or a
 * registration.
 */
export const SaVerifyOtp = defineComponent({
  name: 'SaVerifyOtp',
  props: {
    channel: { type: String as PropType<OtpChannel>, default: 'email' },
  },
  setup(props) {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const flow =
      navigation.state<{ flow: string }>().flow === 'login' ? 'login' : 'register';

    const copy = computed(() => COPY[props.channel]);
    const code = ref('');
    const error = ref('');
    const resendMessage = ref('');
    const loading = ref(false);
    const secondsLeft = ref(OTP_LIFETIME_SECONDS);
    let timer: ReturnType<typeof setInterval> | undefined;

    onMounted(() => {
      // The registration screen offers passkey enrolment next, which needs this.
      if (props.channel === 'email') void auth.checkPasskeySupport();

      timer = setInterval(() => {
        secondsLeft.value = Math.max(0, secondsLeft.value - 1);
      }, 1000);
    });
    onBeforeUnmount(() => clearInterval(timer));

    const resend = async () => {
      error.value = '';
      resendMessage.value = '';

      const result = await requestOtp(auth.client, props.channel, flow);

      if (result.error) {
        error.value = otpResendFailedMessage(props.channel);
        return;
      }

      resendMessage.value = copy.value.resent;
    };

    const submit = async (event: Event) => {
      event.preventDefault();
      if (loading.value) return;
      error.value = '';
      loading.value = true;

      try {
        const passkeySupported =
          props.channel === 'email' ? await auth.checkPasskeySupport() : false;

        const result = await verifyOtp(
          { client: auth.client, refreshSession: auth.refreshSession },
          { channel: props.channel, flow, code: code.value, passkeySupported }
        );

        if (result.error !== null) {
          error.value = result.error;
          return;
        }

        if (result.next === 'register_passkey')
          await navigation.toScreen('registerPasskey');
        else if (result.next === 'verify_email')
          await navigation.toScreen('verifyEmailOtp');
        else await navigation.toApp();
      } catch {
        // Backstop for unexpected errors only.
        error.value = 'Verification failed.';
      } finally {
        loading.value = false;
      }
    };

    return () =>
      h(SaAuthLayout, null, () => [
        h('h2', { class: 'sa-heading' }, copy.value.title),
        h('p', { class: 'sa-subtitle' }, copy.value.subtitle),
        error.value && h('p', { class: 'sa-error' }, error.value),
        resendMessage.value && h('p', { class: 'sa-success' }, resendMessage.value),
        h('form', { onSubmit: submit }, [
          h('div', [
            h('span', { class: 'sa-label' }, [
              `${copy.value.label} `,
              h(
                'span',
                { class: 'sa-timer' },
                `(code expires in ${formatCountdown(secondsLeft.value)})`
              ),
            ]),
            h(SaOtpInput, {
              modelValue: code.value,
              'onUpdate:modelValue': (value: string) => {
                code.value = value;
              },
              length: OTP_LENGTH,
              mode: props.channel === 'email' ? 'text' : 'numeric',
            }),
            h(
              'button',
              { type: 'button', class: 'sa-link', onClick: resend },
              copy.value.resend
            ),
          ]),
          h(
            'button',
            { type: 'submit', class: 'sa-button', disabled: loading.value },
            loading.value ? 'Verifying...' : 'Verify & Continue'
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'sa-link',
              onClick: () => navigation.toScreen('login'),
            },
            'Back to login'
          ),
        ]),
      ]);
  },
});
