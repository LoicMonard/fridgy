import { useRef, useState } from 'react';
import { parseReceiptImage } from '../services/receiptService';
import type { ReceiptProduct } from '../types';

export type ReceiptScanStep = 'idle' | 'processing' | 'done' | 'error';

export function useReceiptScan() {
  const [step, setStep] = useState<ReceiptScanStep>('idle');
  const [items, setItems] = useState<ReceiptProduct[]>([]);
  const [error, setError] = useState<'LLM_FAILED' | null>(null);
  const processingRef = useRef(false);

  async function processPhoto(imageBase64: string, mimeType = 'image/jpeg') {
    if (processingRef.current) return;
    processingRef.current = true;
    setError(null);
    setStep('processing');

    try {
      const parsed = await parseReceiptImage(imageBase64, mimeType);
      setItems(parsed);
      setStep('done');
    } catch (err) {
      console.error('[useReceiptScan]', err);
      setError('LLM_FAILED');
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
