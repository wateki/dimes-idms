import { useEffect, useState, useCallback } from 'react';

/** Geo response from ipapi.co (only fields we use) */
interface GeoResponse {
  country_code?: string;
  country_name?: string;
  currency?: string;
}

/** Frankfurter latest rates response */
interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/** Common currency symbols; fallback to code (e.g. KES) when missing */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  ZAR: 'R',
  KES: 'KSh',
  NGN: '₦',
  GHS: '₵',
};

const GEO_API = 'https://ipapi.co/json/';
const RATES_API = 'https://api.frankfurter.app/latest';

export interface PricingCurrencyState {
  /** User's detected currency code (e.g. USD, EUR) */
  currency: string;
  /** Exchange rate from USD to currency (1 USD = rate * currency) */
  rate: number;
  /** User's country name */
  country: string | null;
  /** Currency symbol for display */
  currencySymbol: string;
  loading: boolean;
  error: string | null;
  /** Whether we're showing converted prices (false if USD or detection failed) */
  isConverted: boolean;
}

const DEFAULT_STATE: PricingCurrencyState = {
  currency: 'USD',
  rate: 1,
  country: null,
  currencySymbol: '$',
  loading: true,
  error: null,
  isConverted: false,
};

function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

/**
 * Detects the user's country via IP (ipapi.co), maps to currency,
 * fetches USD→local exchange rate (Frankfurter), and exposes
 * formatted pricing. Falls back to USD on any failure or timeout.
 */
export function usePricingCurrency() {
  const [state, setState] = useState<PricingCurrencyState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const geoRes = await Promise.race([
          fetch(GEO_API),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Geo timeout')), 5000)
          ),
        ]);
        if (cancelled) return;
        if (!geoRes.ok) throw new Error('Geo fetch failed');

        const geo = (await geoRes.json()) as GeoResponse;
        const currency = (geo.currency || 'USD').toUpperCase();
        const country = geo.country_name ?? null;

        if (currency === 'USD') {
          setState({
            currency: 'USD',
            rate: 1,
            country,
            currencySymbol: '$',
            loading: false,
            error: null,
            isConverted: false,
          });
          return;
        }

        const ratesRes = await Promise.race([
          fetch(`${RATES_API}?from=USD&to=${encodeURIComponent(currency)}`),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Rates timeout')), 5000)
          ),
        ]);
        if (cancelled) return;
        if (!ratesRes.ok) throw new Error('Rates fetch failed');

        const ratesData = (await ratesRes.json()) as FrankfurterResponse;
        const rate = ratesData.rates?.[currency];
        if (rate == null) throw new Error(`No rate for ${currency}`);

        setState({
          currency,
          rate,
          country,
          currencySymbol: getCurrencySymbol(currency),
          loading: false,
          error: null,
          isConverted: true,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          ...DEFAULT_STATE,
          loading: false,
          error: e instanceof Error ? e.message : 'Detection failed',
        });
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatPrice = useCallback(
    (usdAmount: number, options?: { showDecimals?: boolean }): string => {
      const { currency, rate, currencySymbol } = state;
      const localAmount = usdAmount * rate;
      const showDecimals = options?.showDecimals ?? (localAmount % 1 !== 0);
      const value = showDecimals
        ? localAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : Math.round(localAmount).toLocaleString();
      if (CURRENCY_SYMBOLS[currency]) {
        return `${currencySymbol}${value}`;
      }
      return `${value} ${currency}`;
    },
    [state.currency, state.rate, state.currencySymbol]
  );

  const convert = useCallback(
    (usdAmount: number): number => state.rate * usdAmount,
    [state.rate]
  );

  return {
    ...state,
    formatPrice,
    convert,
  };
}
