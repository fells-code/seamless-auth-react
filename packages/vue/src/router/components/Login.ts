/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  beginSignIn,
  isValidEmail,
  isValidPhoneNumber,
  PASSKEY_SIGN_IN_FAILED,
  registerWithEmail,
  type LoginMethod,
} from '@seamless-auth/client';
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';
import { SaFallbackOptions } from './FallbackOptions';
import { SaOAuthProviderButtons } from './OAuthProviderButtons';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;

/** Sign in with an email or phone number, or create an account with an email. */
export const SaLogin = defineComponent({
  name: 'SaLogin',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();

    // Opens on Sign In for a browser that has signed in before.
    const mode = ref<'login' | 'register'>(
      auth.hasSignedInBefore.value ? 'login' : 'register'
    );
    watch(auth.hasSignedInBefore, seen => {
      if (seen) mode.value = 'login';
    });

    const identifier = ref('');
    const email = ref('');
    const identifierError = ref('');
    const emailError = ref('');
    const formError = ref('');
    const showFallbackOptions = ref(false);
    const loginMethods = ref<LoginMethod[] | null>(null);
    const submitting = ref(false);

    const canSubmit = computed(() =>
      mode.value === 'login'
        ? isValidEmail(identifier.value) || isValidPhoneNumber(identifier.value)
        : // Registration only needs a valid email. A phone can be added later.
          isValidEmail(email.value)
    );

    // A disabled button is skipped by screen readers and explains nothing to
    // anyone else, so the reason it is refusing lives in a live region instead.
    const submitHint = computed(() => {
      if (mode.value === 'login') {
        if (!identifier.value) return 'Enter your email or phone number to continue.';
        return canSubmit.value
          ? 'Ready to continue.'
          : 'This does not look like a complete email or phone number yet.';
      }

      if (!email.value) return 'Enter your email address to continue.';
      return canSubmit.value
        ? 'Ready to continue.'
        : 'This does not look like a complete email address yet.';
    });

    onMounted(() => {
      void auth.loadLoginMethods();
      void auth.checkPasskeySupport();
    });

    const validateIdentifier = () => {
      if (!identifier.value) return;
      identifierError.value =
        isValidEmail(identifier.value) || isValidPhoneNumber(identifier.value)
          ? ''
          : 'Please enter a valid email or phone number';
    };

    const validateEmail = () => {
      if (!email.value) return;
      emailError.value = isValidEmail(email.value) ? '' : 'Please enter a valid email';
    };

    const submit = async (event: Event) => {
      event.preventDefault();
      if (!canSubmit.value || submitting.value) return;

      formError.value = '';
      showFallbackOptions.value = false;
      submitting.value = true;

      try {
        if (mode.value === 'register') {
          const { error } = await registerWithEmail(auth.client, email.value);

          if (error) {
            formError.value = error;
            return;
          }

          await navigation.toScreen('verifyEmailOtp');
          return;
        }

        // Both are cached, so awaiting them costs nothing once loaded and
        // removes the race where a fast submit saw passkeys as unsupported.
        const [passkeySupported, configuredMethods] = await Promise.all([
          auth.checkPasskeySupport(),
          auth.loadLoginMethods(),
        ]);

        const step = await beginSignIn(auth, {
          identifier: identifier.value,
          passkeySupported,
          configuredMethods,
        });

        if (step.kind === 'error') {
          formError.value = step.message;
          return;
        }

        if (step.kind === 'signed_in') {
          await navigation.toApp();
          return;
        }

        loginMethods.value = step.loginMethods;
        showFallbackOptions.value = true;

        if (step.passkeyFailed) formError.value = PASSKEY_SIGN_IN_FAILED;
      } catch {
        // Backstop for unexpected errors only. The client reports request
        // failures through `error`, not by throwing.
        formError.value = 'Failed to continue sign-in. Please try again.';
      } finally {
        submitting.value = false;
      }
    };

    const retryPasskey = async () => {
      formError.value = '';
      const { error } = await auth.handlePasskeyLogin();

      if (error) {
        formError.value = PASSKEY_SIGN_IN_FAILED;
        return;
      }

      await navigation.toApp();
    };

    const sendMagicLink = async () => {
      const { error } = await auth.client.requestMagicLink();

      if (error) {
        formError.value = 'Failed to send magic link.';
        return;
      }

      await navigation.toScreen('magicLinkSent', { identifier: identifier.value });
    };

    const sendEmailOtp = async () => {
      const { error } = await auth.client.requestLoginEmailOtp();

      if (error) {
        formError.value = 'Failed to send email code.';
        return;
      }

      await navigation.toScreen('verifyEmailOtp', { flow: 'login' });
    };

    const sendPhoneOtp = async () => {
      const { error } = await auth.client.requestLoginPhoneOtp();

      if (error) {
        formError.value = 'Failed to send OTP.';
        return;
      }

      await navigation.toScreen('verifyPhoneOtp', { flow: 'login' });
    };

    const loginFields = () =>
      h('div', { class: 'sa-input-group' }, [
        h(
          'label',
          { for: 'identifier', class: 'sa-label' },
          'Email Address / Phone Number'
        ),
        h('input', {
          id: 'identifier',
          type: 'text',
          class: 'sa-input',
          autocomplete: 'off',
          placeholder: 'Email or Phone Number',
          required: true,
          value: identifier.value,
          onInput: (event: Event) => {
            identifier.value = valueOf(event);
          },
          onBlur: validateIdentifier,
        }),
        h(
          'p',
          { class: 'sa-helper-text' },
          'Phone numbers must include a country code e.g. +1'
        ),
        showFallbackOptions.value &&
          h(SaFallbackOptions, {
            identifier: identifier.value,
            loginMethods: loginMethods.value,
            offerPasskeyRetry: auth.passkeySupported.value,
            onMagicLink: sendMagicLink,
            onEmailOtp: sendEmailOtp,
            onPhoneOtp: sendPhoneOtp,
            onPasskeyRetry: retryPasskey,
          }),
        identifierError.value && h('p', { class: 'sa-error' }, identifierError.value),
      ]);

    const registerFields = () =>
      h('div', { class: 'sa-input-group' }, [
        h('label', { for: 'email', class: 'sa-label' }, 'Email Address'),
        h('input', {
          id: 'email',
          type: 'email',
          class: 'sa-input',
          autocomplete: 'off',
          required: true,
          value: email.value,
          onInput: (event: Event) => {
            email.value = valueOf(event);
          },
          onBlur: validateEmail,
        }),
        emailError.value && h('p', { class: 'sa-error' }, emailError.value),
      ]);

    return () =>
      h(SaAuthLayout, null, () => [
        h(
          'h2',
          { class: 'sa-heading' },
          mode.value === 'login' ? 'Sign In' : 'Create Account'
        ),
        h('form', { onSubmit: submit }, [
          mode.value === 'login' ? loginFields() : registerFields(),
          h(
            'button',
            {
              type: 'submit',
              class: 'sa-button',
              disabled: !canSubmit.value || submitting.value,
              'aria-describedby': 'seamless-submit-hint',
            },
            mode.value === 'login' ? 'Login' : 'Register'
          ),
          h(
            'p',
            { id: 'seamless-submit-hint', role: 'status', class: 'sa-submit-hint' },
            submitHint.value
          ),
          formError.value && h('p', { class: 'sa-error' }, formError.value),
          h(
            'button',
            {
              type: 'button',
              class: 'sa-link',
              onClick: () => {
                mode.value = mode.value === 'login' ? 'register' : 'login';
              },
            },
            mode.value === 'login'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'
          ),
        ]),
        h(SaOAuthProviderButtons),
      ]);
  },
});
