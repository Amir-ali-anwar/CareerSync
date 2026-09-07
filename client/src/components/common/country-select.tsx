"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { getAllCountries, type CountryOption } from "@/lib/location-data";

interface CountrySelectProps {
  id?: string;
  value: string | undefined;
  onChange: (country: CountryOption | null) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function CountrySelect({ id, value, onChange, disabled, ...rest }: CountrySelectProps) {
  const countries = useMemo(() => getAllCountries(), []);
  const selected = useMemo(() => countries.find((c) => c.value === value) ?? null, [countries, value]);

  return (
    <Combobox
      items={countries}
      value={selected}
      onValueChange={(next) => onChange(next)}
      disabled={disabled}
    >
      <ComboboxInputGroup>
        <ComboboxInput id={id} placeholder="Search country…" aria-invalid={rest["aria-invalid"]} />
        <ComboboxTrigger />
      </ComboboxInputGroup>
      <ComboboxContent emptyMessage="No countries found.">
        {(country: CountryOption) => (
          <ComboboxItem key={country.value} value={country}>
            {country.label}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
