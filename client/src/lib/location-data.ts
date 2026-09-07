import { Country } from "country-state-city";
import type { CountryCode } from "libphonenumber-js";

export interface CountryOption {
  value: string;
  label: string;
  callingCode: string;
}

let countriesCache: CountryOption[] | null = null;

export function getAllCountries(): CountryOption[] {
  if (!countriesCache) {
    countriesCache = Country.getAllCountries()
      .map((country) => ({
        value: country.isoCode,
        label: country.name,
        callingCode: country.phonecode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  return countriesCache;
}

export function getCountryLabel(isoCode: string | undefined): string {
  if (!isoCode) return "";
  return Country.getCountryByCode(isoCode)?.name ?? isoCode;
}

export function getCallingCode(isoCode: string | undefined): string {
  if (!isoCode) return "";
  return Country.getCountryByCode(isoCode)?.phonecode ?? "";
}

/** country-state-city's ISO codes are the same alpha-2 codes libphonenumber-js expects. */
export function toPhoneCountryCode(isoCode: string | undefined): CountryCode | undefined {
  return isoCode as CountryCode | undefined;
}

const citiesCache = new Map<string, string[]>();

/**
 * The city dataset is a multi-megabyte JSON file, so it's loaded via a dynamic
 * import (its own chunk) instead of being bundled into every page that imports
 * this module.
 */
export async function getCitiesForCountry(isoCode: string | undefined): Promise<string[]> {
  if (!isoCode) return [];
  const cached = citiesCache.get(isoCode);
  if (cached) return cached;

  const { default: City } = await import("country-state-city/lib/city");
  const names = Array.from(
    new Set((City.getCitiesOfCountry(isoCode) ?? []).map((city) => city.name))
  ).sort((a, b) => a.localeCompare(b));
  citiesCache.set(isoCode, names);
  return names;
}
