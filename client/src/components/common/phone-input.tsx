"use client";

import { useEffect, useState } from "react";
import { AsYouType } from "libphonenumber-js";
import { cn } from "@/lib/utils";
import { getCallingCode, toPhoneCountryCode } from "@/lib/location-data";

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (e164: string) => void;
  countryIsoCode: string | undefined;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function PhoneInput({ id, value, onChange, countryIsoCode, disabled, ...rest }: PhoneInputProps) {
  const callingCode = getCallingCode(countryIsoCode);
  const phoneCountry = toPhoneCountryCode(countryIsoCode);
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay("");
    onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIsoCode]);

  useEffect(() => {
    if (!value) setDisplay("");
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    if (!phoneCountry) {
      setDisplay(raw);
      onChange(raw);
      return;
    }
    const formatter = new AsYouType(phoneCountry);
    setDisplay(formatter.input(raw));
    onChange(formatter.getNumberValue() ?? "");
  }

  return (
    <div
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:opacity-50",
        rest["aria-invalid"] && "border-destructive ring-3 ring-destructive/20"
      )}
    >
      <span className="shrink-0 text-muted-foreground tabular-nums">{callingCode ? `+${callingCode}` : "+"}</span>
      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        disabled={disabled || !countryIsoCode}
        placeholder={countryIsoCode ? "555 123 4567" : "Select a country first"}
        value={display}
        onChange={handleChange}
        className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
