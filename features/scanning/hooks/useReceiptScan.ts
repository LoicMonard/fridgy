import { useRef, useState } from 'react';
import MlkitOcr from 'react-native-mlkit-ocr';
import { parseReceiptOcr } from '../services/receiptService';
import type { ReceiptProduct } from '../types';

export type ReceiptScanStep = 'idle' | 'ocr' | 'llm' | 'done' | 'error';

export function useReceiptScan() {
  const [step, setStep] = useState<ReceiptScanStep>('idle');
  const [items, setItems] = useState<ReceiptProduct[]>([]);
  const [error, setError] = useState<'OCR_FAILED' | 'LLM_FAILED' | null>(null);
  const processingRef = useRef(false);

  async function processPhoto(imageUri: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setError(null);

    try {
      // Step 1 — on-device OCR via MLKit
      setStep('ocr');
      const blocks = await MlkitOcr.detectFromUri(imageUri);
      const ocrText = blocks.map((b) => b.text).join('\n').trim();

      if (!ocrText) {
        setError('OCR_FAILED');
        setStep('error');
        return;
      }

      // Step 2 — Supabase Edge Function → Gemini Flash
      setStep('llm');
      const parsed = await parseReceiptOcr(ocrText);
      setItems(parsed);
      setStep('done');
    } catch (err) {
      console.error('[useReceiptScan]', err);
      const isOcrStep = step === 'ocr';
      setError(isOcrStep ? 'OCR_FAILED' : 'LLM_FAILED');
      setStep('error');
    } finally {
      processingRef.current = false;
    }
  }

  function reset() {
    setStep('idle');
    setItems([]);
    setError(null);
    processingRef.current = false;
  }

  return { step, items, error, processPhoto, reset };
}
