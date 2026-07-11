-- Add needs_review to receipt_status enum
ALTER TYPE receipt_status ADD VALUE IF NOT EXISTS 'needs_review';

-- Add columns for storing extraction results and raw OCR text
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS extracted_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_ocr_text text DEFAULT '';
