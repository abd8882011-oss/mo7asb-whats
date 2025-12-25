
export enum TransactionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING'
}

export interface Transaction {
  id: string;
  currency: string;
  amount: number;
  type: TransactionType;
  description: string;
  originalText?: string;
}

export interface ExchangeRates {
  [currency: string]: number;
}

export interface CurrencySummary {
  currency: string;
  totalIncoming: number;
  totalOutgoing: number;
  balance: number;
  usdValue: number;
}
