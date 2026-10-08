/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import parsePhoneNumberFromString from 'libphonenumber-js';

/**
 * Whether a value is a syntactically valid email address. Deliberately stricter
 * than RFC 5322 where the RFC allows forms no mail provider issues.
 */
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;

  const normalized = email.trim();

  if (normalized.length < 3 || normalized.length > 320) return false;

  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;

  if (
    !/^[A-Za-z0-9._%+-]+$/.test(localPart) ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..')
  ) {
    return false;
  }

  if (
    !/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domainPart) ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.includes('..')
  ) {
    return false;
  }

  return true;
};

/** Whether a value is a valid phone number. It must carry a country code. */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneNumber = parsePhoneNumberFromString(phone);
  return phoneNumber?.isValid() || false;
};
