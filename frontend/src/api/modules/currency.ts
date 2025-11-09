import type { HttpClient } from './http';
import type { CurrencyResponse, ExchangeRateResponse, CurrencyConversionResponse } from './types';

export function createCurrencyApi(http: HttpClient) {
  return {
    async getSupportedCurrencies(): Promise<CurrencyResponse> {
      const response = await http.client.get('/integrations/currencies/');
      return response.data;
    },

    async getExchangeRates(baseCurrency = 'USD'): Promise<ExchangeRateResponse> {
      const response = await http.client.get(
        `/integrations/currencies/exchange-rates/?base=${baseCurrency}`
      );
      return response.data;
    },

    async convertCurrency(
      fromCurrency: string,
      toCurrency: string,
      amount: number
    ): Promise<CurrencyConversionResponse> {
      const response = await http.client.post('/integrations/currencies/convert/', {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount,
      });

      return response.data;
    },
  };
}
