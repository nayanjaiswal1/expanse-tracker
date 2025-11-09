import { z } from 'zod';

export const invoiceGeneratorSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be less than 100 characters'),
  client_email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  client_address: z.string().max(500, 'Address must be less than 500 characters').optional(),
  invoice_number: z
    .string()
    .min(1, 'Invoice number is required')
    .max(50, 'Invoice number must be less than 50 characters'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  tax_rate: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
      'Tax rate must be between 0 and 100'
    )
    .optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Item description is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unit_price: z.number().min(0, 'Unit price must be positive'),
        total: z.number().optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

export const pdfProcessorSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.type === 'application/pdf', 'Only PDF files are allowed')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'PDF must be smaller than 10MB'),
  password: z.string().optional(),
  extract_text: z.boolean(),
  extract_tables: z.boolean(),
  extract_images: z.boolean(),
  ocr_enabled: z.boolean(),
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'], {
    required_error: 'Please select a language',
  }),
});

export const receiptScannerSchema = z.object({
  image: z
    .instanceof(File)
    .refine((file) => file.type.startsWith('image/'), 'Only image files are allowed')
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be smaller than 5MB'),
  account_id: z.number().min(1, 'Please select an account'),
  category_id: z.number().min(1, 'Please select a category').optional(),
  auto_categorize: z.boolean(),
  extract_merchant: z.boolean(),
  extract_items: z.boolean(),
  confidence_threshold: z
    .number()
    .min(0.1, 'Confidence threshold must be at least 0.1')
    .max(1.0, 'Confidence threshold must be at most 1.0'),
});

export const ollamaManagementSchema = z.object({
  model_name: z
    .string()
    .min(1, 'Model name is required')
    .max(100, 'Model name must be less than 100 characters'),
  model_tag: z.string().optional(),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2'),
  max_tokens: z
    .number()
    .min(1, 'Max tokens must be at least 1')
    .max(4096, 'Max tokens must be at most 4096'),
  system_prompt: z.string().max(2000, 'System prompt must be less than 2000 characters').optional(),
  enable_streaming: z.boolean(),
  enable_gpu: z.boolean(),
});

export const aiSettingsSchema = z
  .object({
    provider: z.enum(['openai', 'ollama', 'claude', 'local'], {
      required_error: 'Please select an AI provider',
    }),
    api_key: z.string().optional(),
    base_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    model: z.string().min(1, 'Model is required'),
    max_tokens: z
      .number()
      .min(1, 'Max tokens must be at least 1')
      .max(8192, 'Max tokens must be at most 8192'),
    temperature: z
      .number()
      .min(0, 'Temperature must be at least 0')
      .max(2, 'Temperature must be at most 2'),
    enable_function_calling: z.boolean(),
    enable_vision: z.boolean(),
    auto_categorization: z.boolean(),
    receipt_scanning: z.boolean(),
    invoice_generation: z.boolean(),
    financial_insights: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if ((data.provider === 'openai' || data.provider === 'claude') && !data.api_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['api_key'],
        message: 'API key is required for the selected provider',
      });
    }
  });

export type InvoiceGeneratorFormData = z.infer<typeof invoiceGeneratorSchema>;
export type PdfProcessorFormData = z.infer<typeof pdfProcessorSchema>;
export type ReceiptScannerFormData = z.infer<typeof receiptScannerSchema>;
export type OllamaManagementFormData = z.infer<typeof ollamaManagementSchema>;
export type AiSettingsFormData = z.infer<typeof aiSettingsSchema>;
