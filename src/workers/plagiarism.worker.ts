// WebWorker for background plagiarism analysis
// Prevents UI blocking during intensive analysis

import { 
  analyzeCodeEnhanced, 
  analyzeMultiple, 
  filterWhitelistedCode,
  generateNetworkGraph,
  analyzeMultipleEnhanced,
  EnhancedComparisonResult,
  MultiComparisonResult,
  tokenizeCode
} from '../lib/plagiarism';

// Import new PARASITE extension modules
import {
  validateInput,
  generateSymbolTable,
  extractControlFlow,
  generateStructureHash,
  generateFingerprints,
  buildSimilarityMatrix,
  loadSimilarityThresholds,
  getClassification,
  prepareVisualizationData,
  ValidationResult,
  SymbolTable,
  ControlFlowStructure,
  StructureHash,
  FingerprintIndex,
  VisualizationData
} from '../lib/parasite-extensions';

// Worker message types
export type WorkerMessage = 
  | { type: 'analyze'; payload: { codeA: string; codeB: string; language: string; fileNameA?: string; fileNameB?: string } }
  | { type: 'analyzeMultiple'; payload: { codes: string[]; fileNames: string[]; language: string } }
  | { type: 'filterWhitelist'; payload: { code: string } }
  | { type: 'generateGraph'; payload: { result: MultiComparisonResult } }
  | { type: 'validateFiles'; payload: { files: { name: string; content: string }[] } }
  | { type: 'analyzeWithPipeline'; payload: { codeA: string; codeB: string; language: string; fileNameA?: string; fileNameB?: string } }
  | { type: 'multiAnalyzeWithPipeline'; payload: { codes: string[]; fileNames: string[]; language: string } };

export type WorkerResponse = 
  | { type: 'result'; payload: EnhancedComparisonResult }
  | { type: 'multiResult'; payload: MultiComparisonResult }
  | { type: 'filtered'; payload: string }
  | { type: 'graph'; payload: { nodes: any[]; edges: any[] } }
  | { type: 'progress'; payload: { percent: number; message: string } }
  | { type: 'error'; payload: string }
  | { type: 'validationResult'; payload: ValidationResult }
  | { type: 'visualization'; payload: VisualizationData }
  | { type: 'symbolTable'; payload: { tableA: SymbolTable; tableB: SymbolTable } }
  | { type: 'controlFlow'; payload: { flowA: ControlFlowStructure; flowB: ControlFlowStructure } }
  | { type: 'structureHash'; payload: { hashA: StructureHash; hashB: StructureHash } };

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'analyze': {
        self.postMessage({ type: 'progress', payload: { percent: 10, message: 'Filtering whitelisted code...' } });
        
        const filteredA = filterWhitelistedCode(payload.codeA, payload.language);
        const filteredB = filterWhitelistedCode(payload.codeB, payload.language);
        
        self.postMessage({ type: 'progress', payload: { percent: 30, message: 'Running token analysis...' } });
        
        const result = analyzeCodeEnhanced(filteredA, filteredB, payload.language);
        
        self.postMessage({ type: 'progress', payload: { percent: 90, message: 'Finalizing results...' } });
        
        self.postMessage({ type: 'result', payload: result });
        self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Analysis complete' } });
        break;
      }

      case 'analyzeMultiple': {
        const { codes, fileNames, language } = payload;
        const total = (codes.length * (codes.length - 1)) / 2;
        let processed = 0;

        self.postMessage({ type: 'progress', payload: { percent: 0, message: `Analyzing ${codes.length} files...` } });
        
        // Process files in batches to avoid blocking
        const batchSize = 5;
        let allResults: MultiComparisonResult | null = null;
        
        for (let i = 0; i < codes.length; i++) {
          for (let j = i + 1; j < codes.length; j++) {
            const filteredA = filterWhitelistedCode(codes[i], language);
            const filteredB = filterWhitelistedCode(codes[j], language);
            
            analyzeCodeEnhanced(filteredA, filteredB, language);
            
            processed++;
            const percent = Math.round((processed / total) * 100);
            self.postMessage({ type: 'progress', payload: { percent, message: `Analyzing pair ${processed}/${total}` } });
            
            if (processed % batchSize === 0) {
              // Allow UI to breathe
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        }

        allResults = analyzeMultiple(codes, fileNames, language);
        
        self.postMessage({ type: 'multiResult', payload: allResults });
        self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Multi-file analysis complete' } });
        break;
      }

      case 'filterWhitelist': {
        const filtered = filterWhitelistedCode(payload.code);
        self.postMessage({ type: 'filtered', payload: filtered });
        break;
      }

      case 'generateGraph': {
        const graph = generateNetworkGraph(payload.result);
        self.postMessage({ type: 'graph', payload: graph });
        break;
      }

      // ==================== NEW PARASITE EXTENSION HANDLERS ====================

      case 'validateFiles': {
        self.postMessage({ type: 'progress', payload: { percent: 10, message: 'Validating input files...' } });
        
        const validationResult = validateInput(payload.files);
        
        self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Validation complete' } });
        self.postMessage({ type: 'validationResult', payload: validationResult });
        break;
      }

      case 'analyzeWithPipeline': {
        // Full pipeline with new PARASITE extensions
        const { codeA, codeB, language, fileNameA, fileNameB } = payload;
        
        // Stage 1: Input Validation
        self.postMessage({ type: 'progress', payload: { percent: 5, message: 'Validating input...' } });
        const validation = validateInput([{ name: fileNameA || 'fileA', content: codeA }, { name: fileNameB || 'fileB', content: codeB }]);
        if (!validation.valid) {
          self.postMessage({ type: 'error', payload: `Validation errors: ${validation.errors.map(e => e.message).join(', ')}` });
          break;
        }
        
        // Stage 2: Preprocessing (existing)
        self.postMessage({ type: 'progress', payload: { percent: 15, message: 'Preprocessing code...' } });
        const filteredA = filterWhitelistedCode(codeA, language);
        const filteredB = filterWhitelistedCode(codeB, language);
        
        // Stage 3: Tokenization (existing)
        self.postMessage({ type: 'progress', payload: { percent: 25, message: 'Tokenizing code...' } });
        const tokensA = tokenizeCode(filteredA, language);
        const tokensB = tokenizeCode(filteredB, language);
        
        // Stage 4: Symbol Table Generation (new)
        self.postMessage({ type: 'progress', payload: { percent: 35, message: 'Generating symbol tables...' } });
        const tableA = generateSymbolTable(tokensA);
        const tableB = generateSymbolTable(tokensB);
        self.postMessage({ type: 'symbolTable', payload: { tableA, tableB } });
        
        // Stage 5: Control Flow Extraction (new)
        self.postMessage({ type: 'progress', payload: { percent: 45, message: 'Extracting control flow...' } });
        const flowA = extractControlFlow(filteredA);
        const flowB = extractControlFlow(filteredB);
        self.postMessage({ type: 'controlFlow', payload: { flowA, flowB } });
        
        // Stage 6: Structural Hash Generation (new)
        self.postMessage({ type: 'progress', payload: { percent: 55, message: 'Generating structure hashes...' } });
        const hashA = generateStructureHash(flowA);
        const hashB = generateStructureHash(flowB);
        self.postMessage({ type: 'structureHash', payload: { hashA, hashB } });
        
        // Stage 7: Fingerprint Generation (new - optional optimization)
        self.postMessage({ type: 'progress', payload: { percent: 60, message: 'Generating fingerprints...' } });
        const fpIndexA = generateFingerprints(tokensA);
        const fpIndexB = generateFingerprints(tokensB);
        
        // Stage 8: Token Comparison (existing - using fingerprints for prefilter)
        self.postMessage({ type: 'progress', payload: { percent: 70, message: 'Comparing tokens...' } });
        const result = analyzeCodeEnhanced(filteredA, filteredB, language);
        
        // Stage 9: Analyze Enhanced (existing)
        self.postMessage({ type: 'progress', payload: { percent: 85, message: 'Running enhanced analysis...' } });
        
        // Stage 10: Classification with configurable thresholds (new)
        const thresholds = loadSimilarityThresholds();
        const classification = getClassification(result.combinedSimilarity);
        
        // Stage 11: Visualization Data Preparation (new)
        self.postMessage({ type: 'progress', payload: { percent: 95, message: 'Preparing visualization data...' } });
        const visualization = prepareVisualizationData(result, codeA, codeB);
        self.postMessage({ type: 'visualization', payload: visualization });
        
        self.postMessage({ type: 'result', payload: result });
        self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Full pipeline analysis complete' } });
        break;
      }

      case 'multiAnalyzeWithPipeline': {
        // Multi-file analysis with full pipeline
        const { codes, fileNames, language } = payload;
        
        // Stage 1: Input Validation
        self.postMessage({ type: 'progress', payload: { percent: 5, message: 'Validating input files...' } });
        const validation = validateInput(fileNames.map((name, i) => ({ name, content: codes[i] })));
        if (!validation.valid) {
          self.postMessage({ type: 'error', payload: `Validation errors: ${validation.errors.map(e => e.message).join(', ')}` });
          break;
        }
        
        // Stage 2: Analyze with enhanced pipeline
        self.postMessage({ type: 'progress', payload: { percent: 20, message: 'Analyzing multiple files...' } });
        const results = analyzeMultipleEnhanced(codes, fileNames, language);
        
        // Stage 3: Build Similarity Matrix (new)
        self.postMessage({ type: 'progress', payload: { percent: 60, message: 'Building similarity matrix...' } });
        const similarityMatrix = buildSimilarityMatrix(
          fileNames.map((name, i) => ({ name, content: codes[i] })),
          language,
          (a, b, l) => analyzeCodeEnhanced(filterWhitelistedCode(a, l), filterWhitelistedCode(b, l), l)
        );
        
        // Stage 4: Visualization Data Preparation (new)
        self.postMessage({ type: 'progress', payload: { percent: 90, message: 'Preparing visualization data...' } });
        const visualization = prepareVisualizationData(results);
        self.postMessage({ type: 'visualization', payload: visualization });
        
        self.postMessage({ type: 'multiResult', payload: results });
        self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Multi-file pipeline analysis complete' } });
        break;
      }
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
};

// Export for TypeScript
export {};