"use client";

import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { getCitiesForCountry } from "@/lib/location-data";

interface CitySelectProps {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  countryIsoCode: string | undefined;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function CitySelect({ id, value, onChange, countryIsoCode, disabled, ...rest }: CitySelectProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryIsoCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCitiesForCountry(countryIsoCode).then((names) => {
      if (cancelled) return;
      setCities(names);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countryIsoCode]);

  return (
    <Combobox
      items={cities}
      inputValue={value}
      onInputValueChange={(next) => onChange(next)}
      disabled={disabled || !countryIsoCode}
    >
      <ComboboxInputGroup>
        <ComboboxInput
          id={id}
          placeholder={
            !countryIsoCode ? "Select a country first" : loading ? "Loading cities…" : "Search or type a city…"
          }
          aria-invalid={rest["aria-invalid"]}
        />
        <ComboboxTrigger />
      </ComboboxInputGroup>
      <ComboboxContent emptyMessage="No matches — your typed city will still be used.">
        {(city: string) => (
          <ComboboxItem key={city} value={city}>
            {city}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
