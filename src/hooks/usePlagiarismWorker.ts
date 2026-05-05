import { useState, useEffect, useCallback, useRef } from 'react';
import type { EnhancedComparisonResult, MultiComparisonResult } from '../lib/plagiarism';

export interface WorkerProgress {
  percent: number;
  message: string;
}

export interface UsePlagiarismWorkerReturn {
  analyze: (codeA: string, codeB: string, language: string, fileNameA?: string, fileNameB?: string) => Promise<EnhancedComparisonResult | null>;
  analyzeMultiple: (codes: string[], fileNames: string[], language: string) => Promise<MultiComparisonResult | null>;
  progress: WorkerProgress | null;
  isProcessing: boolean;
  error: string | null;
}

export function usePlagiarismWorker(): UsePlagiarismWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebWorker
    workerRef.current = new Worker(
      new URL('../workers/plagiarism.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = useCallback(async (
    codeA: string, 
    codeB: string, 
    language: string,
    fileNameA?: string,
    fileNameB?: string
  ): Promise<EnhancedComparisonResult | null> => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    setError(null);
    setProgress({ percent: 0, message: 'Starting analysis...' });

    return new Promise((resolve) => {
      const worker = workerRef.current!;

      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        
        if (type === 'progress') {
          setProgress(payload);
        } else if (type === 'result') {
          setIsProcessing(false);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(payload);
        } else if (type === 'error') {
          setIsProcessing(false);
          setError(payload);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(null);
        }
      };

      const handleError = (err: ErrorEvent) => {
        setIsProcessing(false);
        setError(err.message);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        resolve(null);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        type: 'analyze',
        payload: { codeA, codeB, language, fileNameA, fileNameB }
      });
    });
  }, []);

  const analyzeMultiple = useCallback(async (
    codes: string[],
    fileNames: string[],
    language: string
  ): Promise<MultiComparisonResult | null> => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    setError(null);
    setProgress({ percent: 0, message: 'Starting multi-file analysis...' });

    return new Promise((resolve) => {
      const worker = workerRef.current!;

      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        
        if (type === 'progress') {
          setProgress(payload);
        } else if (type === 'multiResult') {
          setIsProcessing(false);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(payload);
        } else if (type === 'error') {
          setIsProcessing(false);
          setError(payload);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(null);
        }
      };

      const handleError = (err: ErrorEvent) => {
        setIsProcessing(false);
        setError(err.message);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        resolve(null);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        type: 'analyzeMultiple',
        payload: { codes, fileNames, language }
      });
    });
  }, []);

  return { analyze, analyzeMultiple, progress, isProcessing, error };
}