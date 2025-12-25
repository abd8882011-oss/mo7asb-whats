
import { Transaction, ExchangeRates } from './types';

// ملاحظة: هذا المسار يجب أن يشير إلى الـ API الذي ستقوم بنشره على Vercel
const API_BASE_URL = '/api'; 

export const cloudService = {
  /**
   * مزامنة الحركات المالية مع السحاب
   */
  async syncTransactions(userId: string, transactions: Transaction[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, transactions }),
      });
      return response.ok;
    } catch (error) {
      console.error('Cloud Sync Error:', error);
      return false;
    }
  },

  /**
   * جلب البيانات من السحاب (Neon DB)
   */
  async fetchUserData(userId: string): Promise<{ transactions: Transaction[], rates: ExchangeRates } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-data/${userId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Cloud Fetch Error:', error);
      return null;
    }
  },

  /**
   * تحديث أسعار الصرف في Neon
   */
  async updateRates(userId: string, rates: ExchangeRates): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/rates/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rates }),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};
