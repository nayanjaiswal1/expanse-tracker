import { apiClient } from './client';

export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
  category_id?: number;
  notes?: string;
  selected?: boolean;
}

export interface ParsedInvoiceData {
  file_name: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  currency?: string;
  merchant_details?: {
    name?: string;
    address?: string;
    phone?: string;
  };
  payment_method?: string;
  line_items: InvoiceLineItem[];
  tax_details?: {
    total_tax?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gst_number?: string;
    tax_rate?: number;
  };
  subtotal?: number;
  discount?: number;
  extraction_method?: string;
}

export interface InvoiceApprovalData {
  account_id: number;
  date: string;
  merchant_name: string;
  invoice_number?: string;
  total_amount: number;
  currency: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  tax_amount?: number;
  payment_method?: string;
}

export interface TransactionWithLineItems {
  id: number;
  date: string;
  amount: number;
  description: string;
  merchant_name?: string;
  notes?: string;
  currency: string;
  metadata: any;
  account: number;
  account_name?: string;
  line_items: Array<{
    id: number;
    amount: number;
    description: string;
    notes?: string;
    category?: number;
    category_name?: string;
    created_at: string;
  }>;
  created_at: string;
}

export const invoiceApi = {
  uploadInvoice: async (file: File): Promise<ParsedInvoiceData> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/finance/invoices/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as ParsedInvoiceData;
  },

  approveInvoice: async (
    data: InvoiceApprovalData
  ): Promise<{ message: string; transaction: TransactionWithLineItems }> => {
    const response = await apiClient.post('/finance/invoices/approve/', data);
    return response.data as { message: string; transaction: TransactionWithLineItems };
  },
};
