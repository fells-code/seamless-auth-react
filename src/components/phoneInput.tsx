import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import { useEffect, useState } from "react";

import styles from "../styles/login.module.css";
import TermsModal from "../TermsModal";

const countries = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
];

function getDefaultCountry(): (typeof countries)[number] {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    const countryCode = locale.split("-")[1]?.toUpperCase() || "US";
    return countries.find((c) => c.code === countryCode) || countries[0];
  } catch {
    return countries[0];
  }
}

interface PhoneInputProps {
  phone: string;
  setPhone: (value: string) => void;
  phoneError: string;
  setPhoneError: (value: string) => void;
}

export default function PhoneInputWithCountryCode({
  phone,
  setPhone,
  phoneError,
  setPhoneError,
}: PhoneInputProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  useEffect(() => {
    const defaultCountry = getDefaultCountry();
    setSelectedCountry(defaultCountry);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const startsWithDialCode = raw.startsWith(selectedCountry.dialCode);
    const full = startsWithDialCode ? raw : selectedCountry.dialCode + raw;
    const formatted = new AsYouType().input(full);
    setPhone(formatted);

    if (phoneError) setPhoneError("");
  };

  const handleBlur = () => {
    if (phone) {
      const parsed = parsePhoneNumberFromString(phone);
      const isValid = parsed?.isValid();
      setPhoneError(isValid ? "" : "Please enter a valid phone number.");
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = countries.find((c) => c.code === e.target.value);
    if (country) {
      setSelectedCountry(country);

      // Rebuild the phone number if necessary
      const stripped = phone.replace(/^\+\d+/, ""); // remove old country code
      const newPhone = new AsYouType().input(country.dialCode + stripped);
      setPhone(newPhone);
    }
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>Phone Number</label>

      <div className={styles.phoneRow}>
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className={styles.select}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} ({country.dialCode})
            </option>
          ))}
        </select>

        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          autoComplete="off"
          placeholder="(555) 123-4567"
          className={styles.phoneInput}
        />
      </div>

      <p className={styles.helperText}>
        By signing up, you agree to our{" "}
        <button onClick={() => setShowModal(true)} className={styles.underline}>
          SMS Terms & Conditions
        </button>
        .
      </p>

      {phoneError && <p className={styles.error}>{phoneError}</p>}

      <TermsModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
