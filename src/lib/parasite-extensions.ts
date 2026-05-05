// PARASITE Compiler-Based Plagiarism Detection Extension
// New modules to enhance the existing pipeline without modifying existing functions

import type { 
  Token, 
  ComparisonResult, 
  EnhancedComparisonResult, 
  MultiComparisonResult,
  GraphNode,
  GraphEdge 
} from './plagiarism';

// ==================== 1. INPUT VALIDATION MODULE ====================

export interface ValidatedFile {
  name: string;
  content: string;
  language: string;
  size: number;
  encoding: string;
}

export interface ValidationResult {
  valid: boolean;
  files: ValidatedFile[];
  errors: ValidationError[];
}

export interface ValidationError {
  fileName: string;
  code: 'INVALID_EXTENSION' | 'EMPTY_FILE' | 'FILE_TOO_LARGE' | 'ENCODING_ERROR';
  message: string;
}

// Supported extensions mapping
const EXTENSION_MAP: Record<string, string> = {
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.java': 'java',
  '.py': 'python',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.php': 'php',
  '.sql': 'sql',
};

const MAX_FILE_SIZE = 1024 * 1024; // 1MB default limit

export function validateInput(files: { name: string; content: string }[]): ValidationResult {
  const errors: ValidationError[] = [];
  const validatedFiles: ValidatedFile[] = [];

  for (const file of files) {
    const ext = getFileExtension(file.name);
    const language = EXTENSION_MAP[ext];
    const size = new Blob([file.content]).size;

    // Check extension
    if (!language) {
      errors.push({
        fileName: file.name,
        code: 'INVALID_EXTENSION',
        message: `Unsupported file extension: ${ext}`,
      });
      continue;
    }

    // Check empty file
    if (!file.content.trim()) {
      errors.push({
        fileName: file.name,
        code: 'EMPTY_FILE',
        message: 'File is empty',
      });
      continue;
    }

    // Check file size
    if (size > MAX_FILE_SIZE) {
      errors.push({
        fileName: file.name,
        code: 'FILE_TOO_LARGE',
        message: `File size (${size} bytes) exceeds maximum (${MAX_FILE_SIZE} bytes)`,
      });
      continue;
    }

    // Normalize encoding to UTF-8
    const normalizedContent = normalizeEncoding(file.content);

    validatedFiles.push({
      name: file.name,
      content: normalizedContent,
      language,
      size,
      encoding: 'UTF-8',
    });
  }

  return {
    valid: errors.length === 0,
    files: validatedFiles,
    errors,
  };
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}

function normalizeEncoding(content: string): string {
  // Ensure UTF-8 encoding by normalizing the string
  // This handles common encoding issues
  try {
    // Replace common encoding artifacts
    const normalized = content
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\uFEFF/g, '');  // Remove BOM if present
    
    // Check for invalid UTF-8 sequences and replace with placeholder
    // This is a simple check - in production you'd want more robust handling
    return normalized;
  } catch {
    // If anything goes wrong, return original content
    return content;
  }
}

// ==================== 2. SYMBOL TABLE GENERATION ====================

export interface SymbolEntry {
  original: string;
  normalized: string;
  type: 'variable' | 'function' | 'class' | 'parameter';
  line: number;
}

export interface SymbolTable {
  entries: SymbolEntry[];
  mapping: Map<string, string>; // original -> normalized
}

export function generateSymbolTable(tokens: Token[]): SymbolTable {
  const mapping = new Map<string, string>();
  const entries: SymbolEntry[] = [];
  let varCounter = 1;
  let funcCounter = 1;
  let classCounter = 1;

  // First pass: identify token types based on context
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'identifier') {
      // Determine the type based on surrounding context
      const type = inferIdentifierType(tokens, i);
      const normalized = getNormalizedName(type, varCounter, funcCounter, classCounter);
      
      // Update counters
      if (type === 'variable') varCounter++;
      else if (type === 'function') funcCounter++;
      else if (type === 'class') classCounter++;

      // Store mapping
      if (!mapping.has(token.value)) {
        mapping.set(token.value, normalized);
      }

      entries.push({
        original: token.value,
        normalized: mapping.get(token.value)!,
        type,
        line: token.line,
      });
    }
  }

  return { entries, mapping };
}

function inferIdentifierType(tokens: Token[], index: number): 'variable' | 'function' | 'class' | 'parameter' {
  const token = tokens[index];
  
  // Look at previous tokens for context
  const prevTokens = tokens.slice(Math.max(0, index - 3), index);
  const prevValues = prevTokens.map(t => t.value.toLowerCase());

  // Check for function declarations
  if (prevValues.includes('def') || prevValues.includes('function') || prevValues.includes('fn')) {
    return 'function';
  }

  // Check for class declarations
  if (prevValues.includes('class')) {
    return 'class';
  }

  // Check for parameter (in function definition)
  if (prevValues.includes('(') || prevValues.includes(',')) {
    return 'parameter';
  }

  // Default to variable
  return 'variable';
}

function getNormalizedName(
  type: 'variable' | 'function' | 'class' | 'parameter',
  varCounter: number,
  funcCounter: number,
  classCounter: number
): string {
  switch (type) {
    case 'variable':
    case 'parameter':
      return `VAR${varCounter}`;
    case 'function':
      return `FUNC${funcCounter}`;
    case 'class':
      return `CLASS${classCounter}`;
    default:
      return `VAR${varCounter}`;
  }
}

// ==================== 3. CONTROL FLOW STRUCTURE EXTRACTION ====================

export type ControlFlowNodeType = 
  | 'IF' 
  | 'ELSE' 
  | 'FOR' 
  | 'WHILE' 
  | 'DO_WHILE' 
  | 'SWITCH' 
  | 'CASE' 
  | 'FUNCTION' 
  | 'RETURN' 
  | 'ASSIGN'
  | 'CALL';

export interface ControlFlowNode {
  type: ControlFlowNodeType;
  line: number;
  children: ControlFlowNode[];
  depth: number;
}

export interface ControlFlowStructure {
  nodes: ControlFlowNode[];
  root: ControlFlowNode;
  flattened: string[]; // e.g., ['FUNCTION', 'IF', 'FOR', 'ASSIGN']
}

const CONTROL_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 
  'continue', 'return', 'def', 'function', 'class', 'public', 'private'
]);

export function extractControlFlow(code: string): ControlFlowStructure {
  const tokens = tokenizeForControlFlow(code);
  const root: ControlFlowNode = {
    type: 'FUNCTION' as ControlFlowNodeType,
    line: 0,
    children: [],
    depth: 0,
  };

  const stack: ControlFlowNode[] = [root];
  let currentDepth = 0;
  let lastStatement: ControlFlowNode | null = null;

  for (const token of tokens) {
    const value = token.value.toLowerCase();

    if (CONTROL_KEYWORDS.has(value)) {
      // Handle different control flow types
      if (value === 'if') {
        const node: ControlFlowNode = {
          type: 'IF',
          line: token.line,
          children: [],
          depth: currentDepth + 1,
        };
        if (lastStatement) {
          lastStatement.children.push(node);
        } else {
          stack[stack.length - 1].children.push(node);
        }
        stack.push(node);
        currentDepth++;
        lastStatement = node;
      } else if (value === 'else') {
        const node: ControlFlowNode = {
          type: 'ELSE',
          line: token.line,
          children: [],
          depth: currentDepth,
        };
        if (stack.length > 1) {
          stack[stack.length - 1].children.push(node);
          stack.push(node);
        }
        lastStatement = node;
      } else if (value === 'for') {
        const node: ControlFlowNode = {
          type: 'FOR',
          line: token.line,
          children: [],
          depth: currentDepth + 1,
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        currentDepth++;
        lastStatement = node;
      } else if (value === 'while') {
        const node: ControlFlowNode = {
          type: 'WHILE',
          line: token.line,
          children: [],
          depth: currentDepth + 1,
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        currentDepth++;
        lastStatement = node;
      } else if (value === 'switch') {
        const node: ControlFlowNode = {
          type: 'SWITCH',
          line: token.line,
          children: [],
          depth: currentDepth + 1,
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        currentDepth++;
        lastStatement = node;
      } else if (value === 'case') {
        const node: ControlFlowNode = {
          type: 'CASE',
          line: token.line,
          children: [],
          depth: currentDepth,
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        }
        lastStatement = node;
      } else if (value === 'return') {
        const node: ControlFlowNode = {
          type: 'RETURN',
          line: token.line,
          children: [],
          depth: currentDepth,
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        }
        lastStatement = node;
      } else if (value === 'def' || value === 'function') {
        const node: ControlFlowNode = {
          type: 'FUNCTION',
          line: token.line,
          children: [],
          depth: currentDepth + 1,
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        currentDepth++;
        lastStatement = node;
      }
    } else if (token.value === '=') {
      // Assignment statement
      const node: ControlFlowNode = {
        type: 'ASSIGN',
        line: token.line,
        children: [],
        depth: currentDepth,
      };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }
      lastStatement = node;
    } else if (token.value === '(' && lastStatement && lastStatement.type !== 'FUNCTION') {
      // Function call
      const node: ControlFlowNode = {
        type: 'CALL',
        line: token.line,
        children: [],
        depth: currentDepth,
      };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }
      // Don't update lastStatement to maintain context
    } else if (token.value === '}') {
      // Close current scope
      if (stack.length > 1) {
        stack.pop();
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
  }

  // Flatten for easier comparison
  const flattened: string[] = [];
  const flattenNodes = (nodes: ControlFlowNode[]) => {
    for (const node of nodes) {
      flattened.push(node.type);
      flattenNodes(node.children);
    }
  };
  flattenNodes(root.children);

  return {
    nodes: [],
    root,
    flattened,
  };
}

// Helper function to tokenize code for control flow analysis
function tokenizeForControlFlow(code: string): { value: string; line: number }[] {
  const tokens: { value: string; line: number }[] = [];
  const lines = code.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (!line) continue;

    // Simple tokenization
    const regex = /([a-zA-Z_]\w*)|([=+\-*/%<>!&|]+)|([(){}[\];,:])/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
      const value = match[0].trim();
      if (value) {
        tokens.push({ value, line: lineNum + 1 });
      }
    }
  }

  return tokens;
}

// ==================== 4. STRUCTURAL HASH GENERATION ====================

export interface StructureHash {
  hash: string;
  normalized: string; // e.g., "IF_FOR_ASSIGN"
  complexity: number;
}

// Rolling hash parameters for efficient hashing
const HASH_BASE = 31;
const HASH_MOD = 1000000007;

export function generateStructureHash(structure: ControlFlowStructure): StructureHash {
  const { flattened } = structure;
  
  if (flattened.length === 0) {
    return {
      hash: '',
      normalized: '',
      complexity: 0,
    };
  }

  // Generate normalized string (e.g., "IF_FOR_ASSIGN")
  const normalized = flattened.join('_');

  // Generate rolling hash
  let hash = 0;
  for (let i = 0; i < flattened.length; i++) {
    const charCode = flattened[i].charCodeAt(0) % HASH_BASE;
    hash = (hash * HASH_BASE + charCode) % HASH_MOD;
  }

  // Calculate complexity based on structure depth and branching
  const complexity = calculateComplexity(flattened);

  return {
    hash: hash.toString(16),
    normalized,
    complexity,
  };
}

function calculateComplexity(flattened: string[]): number {
  let complexity = 0;
  let nestingLevel = 0;
  let maxNesting = 0;

  for (const node of flattened) {
    if (['IF', 'FOR', 'WHILE', 'SWITCH', 'FUNCTION'].includes(node)) {
      nestingLevel++;
      maxNesting = Math.max(maxNesting, nestingLevel);
      complexity += 1;
    } else if (node === 'ELSE' || node === 'CASE') {
      complexity += 0.5;
    } else if (node === '}') {
      nestingLevel = Math.max(0, nestingLevel - 1);
    }
  }

  // Add base complexity for number of control structures
  complexity += flattened.length;

  return Math.round(complexity);
}

// ==================== 5. SIMILARITY MATRIX FOR MULTI-FILE COMPARISON ====================

// This function is already implemented in plagiarism.ts as analyzeMultiple()
// We're adding an extended version with more detailed matrix output

export interface SimilarityMatrixResult {
  matrix: number[][];
  labels: string[];
  maxSimilarity: { i: number; j: number; value: number };
  minSimilarity: { i: number; j: number; value: number };
  averageSimilarity: number;
}

export function buildSimilarityMatrix(
  files: { name: string; content: string }[],
  language: string,
  compareFunction: (codeA: string, codeB: string, lang: string) => ComparisonResult
): SimilarityMatrixResult {
  const n = files.length;
  const labels = files.map(f => f.name);
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Track min/max for reporting
  let maxSim = { i: 0, j: 0, value: 0 };
  let minSim = { i: 0, j: 0, value: 100 };
  let totalSim = 0;
  let pairCount = 0;

  // Compute pairwise similarities
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 100; // Self-similarity is always 100%
    
    for (let j = i + 1; j < n; j++) {
      const result = compareFunction(files[i].content, files[j].content, language);
      const similarity = result.similarity;
      
      matrix[i][j] = similarity;
      matrix[j][i] = similarity;
      
      pairCount++;
      totalSim += similarity;

      if (similarity > maxSim.value) {
        maxSim = { i, j, value: similarity };
      }
      if (similarity < minSim.value) {
        minSim = { i, j, value: similarity };
      }
    }
  }

  return {
    matrix,
    labels,
    maxSimilarity: maxSim,
    minSimilarity: minSim,
    averageSimilarity: pairCount > 0 ? Math.round(totalSim / pairCount) : 0,
  };
}

// ==================== 6. THRESHOLD CONFIGURATION ====================

export interface SimilarityThresholds {
  low: { min: number; max: number };
  medium: { min: number; max: number };
  high: { min: number; max: number };
}

// Default thresholds (can be overridden)
let customThresholds: SimilarityThresholds | null = null;

export function loadSimilarityThresholds(overrides?: Partial<SimilarityThresholds>): SimilarityThresholds {
  const defaults: SimilarityThresholds = {
    low: { min: 0, max: 30 },
    medium: { min: 30, max: 65 },
    high: { min: 65, max: 100 },
  };

  if (overrides) {
    customThresholds = { ...defaults, ...overrides };
    return customThresholds;
  }

  return customThresholds || defaults;
}

export function getClassification(similarity: number): 'Low' | 'Medium' | 'High' {
  const thresholds = loadSimilarityThresholds();
  
  if (similarity <= thresholds.low.max) {
    return 'Low';
  } else if (similarity <= thresholds.medium.max) {
    return 'Medium';
  } else {
    return 'High';
  }
}

export function resetThresholds(): void {
  customThresholds = null;
}

// ==================== 7. FINGERPRINT OPTIMIZATION ====================

export interface Fingerprint {
  hash: number;
  tokens: string[];
  positions: number[];
}

export interface FingerprintIndex {
  fingerprints: Map<string, Fingerprint[]>;
  fileIndex: Map<string, number>;
}

// Rolling hash parameters
const FINGERPRINT_WINDOW = 5;
const FINGERPRINT_PRIME = 1000003;

export function generateFingerprints(tokens: Token[]): FingerprintIndex {
  const fingerprints = new Map<string, Fingerprint[]>();
  const fileIndex = new Map<string, number>();

  // Get normalized token values
  const normalizedTokens = tokens.map(t => t.normalized);

  // Generate rolling hashes for n-grams
  for (let i = 0; i <= normalizedTokens.length - FINGERPRINT_WINDOW; i++) {
    const window = normalizedTokens.slice(i, i + FINGERPRINT_WINDOW);
    const key = window.join('|');
    
    // Compute rolling hash
    let hash = 0;
    for (let j = 0; j < window.length; j++) {
      hash = (hash * FINGERPRINT_PRIME + window[j].charCodeAt(0)) % Number.MAX_SAFE_INTEGER;
    }

    // Store fingerprint
    if (!fingerprints.has(key)) {
      fingerprints.set(key, []);
    }
    fingerprints.get(key)!.push({
      hash,
      tokens: window,
      positions: [i],
    });
  }

  return { fingerprints, fileIndex };
}

// Quick prefilter to determine if two files warrant detailed comparison
export function prefilterCandidates(
  fingerprintsA: FingerprintIndex,
  fingerprintsB: FingerprintIndex
): boolean {
  let commonFingerprints = 0;

  for (const [key, fpsA] of fingerprintsA.fingerprints) {
    const fpsB = fingerprintsB.fingerprints.get(key);
    if (fpsB && fpsB.length > 0) {
      commonFingerprints++;
    }
  }

  // If more than 20% fingerprints match, worth comparing in detail
  const totalFingerprints = fingerprintsA.fingerprints.size;
  const matchRatio = totalFingerprints > 0 ? commonFingerprints / totalFingerprints : 0;

  return matchRatio > 0.2;
}

// ==================== 8. VISUALIZATION DATA PREPARATION ====================

export interface VisualizationData {
  matchedLines: MatchedLineHighlight[];
  similarityGraph: SimilarityGraph;
  networkGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  sideBySideDiff: SideBySideDiff;
  heatmap: HeatmapData;
}

export interface MatchedLineHighlight {
  lineNumber: number;
  content: string;
  matched: boolean;
  similarity?: number;
}

export interface SimilarityGraph {
  labels: string[];
  data: number[];
}

export interface SideBySideDiff {
  left: MatchedLineHighlight[];
  right: MatchedLineHighlight[];
}

export interface HeatmapCell {
  row: number;
  col: number;
  value: number; // Similarity percentage 0-100
  rowLabel: string; // File name on row
  colLabel: string; // File name on column
  classification: 'Low' | 'Medium' | 'High';
  color: string;
  isSelf: boolean; // True if same file comparison
}

export interface HeatmapData {
  cells: HeatmapCell[];
  labels: string[];
  matrix: number[][];
  summary: {
    highestSimilarity: { files: [string, string]; value: number };
    lowestSimilarity: { files: [string, string]; value: number };
    averageSimilarity: number;
    totalComparisons: number;
  };
}

// Color scale for similarity (green = high, yellow = medium, red = low)
function getSimilarityColor(similarity: number): string {
  if (similarity >= 65) return '#22c55e'; // green
  if (similarity >= 30) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export function prepareVisualizationData(
  result: EnhancedComparisonResult | MultiComparisonResult,
  codeA?: string,
  codeB?: string
): VisualizationData {
  // Determine result type
  const isMultiComparison = 'matrix' in result && Array.isArray(result.matrix);

  if (isMultiComparison) {
    return prepareMultiVisualizationData(result as MultiComparisonResult);
  } else {
    return preparePairVisualizationData(result as EnhancedComparisonResult, codeA, codeB);
  }
}

function preparePairVisualizationData(
  result: EnhancedComparisonResult,
  codeA?: string,
  codeB?: string
): VisualizationData {
  // Matched line highlighting
  const matchedLineHighlight: MatchedLineHighlight[] = [];
  const matchedLinesSet = new Set(result.matchedLines.map(m => m.lineA));

  if (codeA) {
    const linesA = codeA.split('\n');
    for (let i = 0; i < linesA.length; i++) {
      matchedLineHighlight.push({
        lineNumber: i + 1,
        content: linesA[i],
        matched: matchedLinesSet.has(i + 1),
      });
    }
  }

  // Similarity graph (simple bar representation)
  const similarityGraph: SimilarityGraph = {
    labels: ['Token', 'AST', 'Combined'],
    data: [result.similarity, result.astResult?.structuralSimilarity || 0, result.combinedSimilarity],
  };

  // Network graph (empty for pair comparison)
  const networkGraph = { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };

  // Side-by-side diff
  let sideBySideDiff: SideBySideDiff = { left: [], right: [] };
  if (codeA && codeB) {
    const linesA = codeA.split('\n');
    const linesB = codeB.split('\n');
    const matchedA = new Set(result.matchedLines.map(m => m.lineA));
    const matchedB = new Set(result.matchedLines.map(m => m.lineB));

    sideBySideDiff = {
      left: linesA.map((content, i) => ({
        lineNumber: i + 1,
        content,
        matched: matchedA.has(i + 1),
      })),
      right: linesB.map((content, i) => ({
        lineNumber: i + 1,
        content,
        matched: matchedB.has(i + 1),
      })),
    };
  }

  // Heatmap (single pair)
  const cell: HeatmapCell = {
    row: 0,
    col: 0,
    value: result.combinedSimilarity,
    rowLabel: 'File A',
    colLabel: 'File B',
    classification: getClassification(result.combinedSimilarity),
    color: getSimilarityColor(result.combinedSimilarity),
    isSelf: false
  };

  const heatmap: HeatmapData = {
    cells: [cell],
    labels: ['File A', 'File B'],
    matrix: [[result.combinedSimilarity]],
    summary: {
      highestSimilarity: { files: ['File A', 'File B'], value: result.combinedSimilarity },
      lowestSimilarity: { files: ['File A', 'File B'], value: result.combinedSimilarity },
      averageSimilarity: result.combinedSimilarity,
      totalComparisons: 1
    }
  };

  return {
    matchedLines: matchedLineHighlight,
    similarityGraph,
    networkGraph,
    sideBySideDiff,
    heatmap,
  };
}

function prepareMultiVisualizationData(result: MultiComparisonResult): VisualizationData {
  const n = result.fileNames.length;
  const labels = result.fileNames;

  // Matched lines (empty for multi)
  const matchedLineHighlight: MatchedLineHighlight[] = [];

  // Similarity graph
  const similarityGraph: SimilarityGraph = {
    labels: result.fileNames,
    data: result.matrix.map((row, i) => row[i] || 0),
  };

  // Network graph
  const nodes: GraphNode[] = labels.map((name, i) => ({
    id: `file-${i}`,
    label: name,
    size: 20 + (result.matrix[i].filter(v => v > 30).length * 5),
    group: Math.floor(i / 3),
  }));

  const edges: GraphEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = result.matrix[i]?.[j];
      if (sim && sim > 20) {
        edges.push({
          source: `file-${i}`,
          target: `file-${j}`,
          weight: sim / 100,
          value: sim,
        });
      }
    }
  }

  // Side-by-side diff (empty for multi)
  const sideBySideDiff: SideBySideDiff = { left: [], right: [] };

  // Heatmap - improved format with cells and summary
  const cells: HeatmapCell[] = [];
  let maxSim = { files: ['', ''] as [string, string], value: 0 };
  let minSim = { files: ['', ''] as [string, string], value: 100 };
  let totalSim = 0;
  let comparisons = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const sim = i === j ? 100 : (result.matrix[i]?.[j] || 0);
      const classification = getClassification(sim);
      const color = i === j ? '#3b82f6' : getSimilarityColor(sim);
      
      cells.push({
        row: i,
        col: j,
        value: Math.round(sim),
        rowLabel: labels[i],
        colLabel: labels[j],
        classification,
        color,
        isSelf: i === j
      });
      
      if (i !== j) {
        comparisons++;
        totalSim += sim;
        if (sim > maxSim.value) {
          maxSim = { files: [labels[i], labels[j]], value: sim };
        }
        if (sim < minSim.value) {
          minSim = { files: [labels[i], labels[j]], value: sim };
        }
      }
    }
  }

  const heatmapMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(i === j ? 100 : (result.matrix[i]?.[j] || 0));
    }
    heatmapMatrix.push(row);
  }

  const heatmap: HeatmapData = {
    cells,
    labels: result.fileNames,
    matrix: heatmapMatrix,
    summary: {
      highestSimilarity: maxSim,
      lowestSimilarity: minSim,
      averageSimilarity: comparisons > 0 ? Math.round(totalSim / comparisons) : 0,
      totalComparisons: comparisons
    }
  };

  return {
    matchedLines: matchedLineHighlight,
    similarityGraph,
    networkGraph: { nodes, edges },
    sideBySideDiff,
    heatmap,
  };
}

// ==================== EXPORT ALL TYPES AND FUNCTIONS ====================

// Re-export types for convenience
export type {
  Token,
  ComparisonResult,
  EnhancedComparisonResult,
  MultiComparisonResult,
  GraphNode,
  GraphEdge,
} from './plagiarism';

// ==================== 9. DATA FLOW ANALYSIS ====================

export interface DataFlowVariable {
  name: string;
  line: number;
  type: 'definition' | 'use' | 'parameter' | 'return';
  scope: string;
  value?: string; // For literal values
}

export interface DataFlowEdge {
  from: string;  // variable name
  to: string;    // variable name
  line: number;
  type: 'direct' | 'indirect';
}

export interface DataFlowAnalysisResult {
  variables: Map<string, DataFlowVariable[]>;
  edges: DataFlowEdge[];
  dependencyChains: string[][]; // Sequences of variable dependencies
  summary: {
    totalVariables: number;
    totalDefinitions: number;
    totalUses: number;
    maxChainLength: number;
  };
}

/**
 * Analyze data flow in code - tracks how variables are defined, used, and flow through the program
 * This helps detect plagiarism even when variables are renamed by tracking data transformation patterns
 */
export function analyzeDataFlow(code: string, language: string): DataFlowAnalysisResult {
  const variables = new Map<string, DataFlowVariable[]>();
  const edges: DataFlowEdge[] = [];
  const dependencyChains: string[][] = [];
  
  const lines = code.split('\n');
  let currentScope = 'global';
  let scopeCounter = 0;
  
  // Language-specific keywords for variable declarations
  const definitionKeywords: Record<string, string[]> = {
    c: ['int', 'float', 'double', 'char', 'void', 'bool', 'long', 'short'],
    cpp: ['int', 'float', 'double', 'char', 'void', 'bool', 'long', 'short', 'string', 'auto'],
    java: ['int', 'float', 'double', 'char', 'void', 'boolean', 'long', 'short', 'String'],
    python: [], // Python has no declaration keywords
    javascript: ['let', 'const', 'var'],
    typescript: ['let', 'const', 'var', 'number', 'string', 'boolean'],
    php: [], // PHP variables start with $
    sql: [], // SQL handled differently
  };
  
  const defKeywords = definitionKeywords[language] || definitionKeywords.c;
  
  // Track pending assignments for data flow chaining
  let pendingDefinitions: string[] = [];
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*')) continue;
    
    // Update scope
    if (line.match(/^(def|function|void|int|public|private|class)\s+/)) {
      currentScope = `scope_${scopeCounter++}`;
    }
    
    // Detect function parameters
    const paramMatch = line.match(/\(([^)]+)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(',').map(p => p.trim().split(' ').pop()).filter(Boolean);
      for (const param of params) {
        addVariable(param, lineNum + 1, 'parameter', currentScope);
      }
    }
    
    // Detect variable definitions (assignments)
    const assignMatch = line.match(/(\w+)\s*=\s*([^;]+)/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const value = assignMatch[2].trim();
      
      // Check if it's a definition (new variable) or reuse
      const isDefinition = defKeywords.some(kw => line.startsWith(kw)) || 
                           line.includes('var') || line.includes('let') || line.includes('const') ||
                           line.match(/^\w+\s+\w+\s*=/);
      
      addVariable(varName, lineNum + 1, isDefinition ? 'definition' : 'use', currentScope, value);
      
      // Create data flow edges from previous definitions
      if (pendingDefinitions.length > 0) {
        for (const prevVar of pendingDefinitions) {
          edges.push({
            from: prevVar,
            to: varName,
            line: lineNum + 1,
            type: 'direct'
          });
        }
      }
      
      pendingDefinitions = [varName];
    }
    
    // Detect variable uses in expressions
    const useMatches = line.match(/(\w+)/g);
    if (useMatches) {
      const uniqueUses = [...new Set(useMatches)];
      for (const varName of uniqueUses) {
        if (!defKeywords.includes(varName) && !['if', 'else', 'for', 'while', 'return', 'switch', 'case'].includes(varName)) {
          // Check if it's already defined, then it's a use
          if (variables.has(varName) && !line.includes(`${varName} =`)) {
            addVariable(varName, lineNum + 1, 'use', currentScope);
            
            // Chain with recent definitions
            if (pendingDefinitions.length > 0) {
              for (const def of pendingDefinitions) {
                edges.push({
                  from: def,
                  to: varName,
                  line: lineNum + 1,
                  type: 'indirect'
                });
              }
            }
          }
        }
      }
    }
    
    // Detect return statements
    if (line.startsWith('return')) {
      const returnVar = line.replace('return', '').trim();
      if (returnVar && !returnVar.startsWith('//')) {
        const returnVars = returnVar.match(/(\w+)/g);
        if (returnVars) {
          for (const v of returnVars) {
            addVariable(v, lineNum + 1, 'return', currentScope);
          }
        }
      }
    }
    
    // Reset pending definitions at statement boundaries
    if (line.endsWith(';') || line.endsWith(':') || line.startsWith('if') || line.startsWith('for') || line.startsWith('while')) {
      // Keep definitions for potential chaining within same statement
    }
  }
  
  // Build dependency chains
  buildDependencyChains(variables, edges, dependencyChains);
  
  // Calculate summary
  let totalDefs = 0;
  let totalUses = 0;
  let maxChain = 0;
  
  for (const [_, vars] of variables) {
    for (const v of vars) {
      if (v.type === 'definition') totalDefs++;
      if (v.type === 'use') totalUses++;
    }
  }
  
  for (const chain of dependencyChains) {
    maxChain = Math.max(maxChain, chain.length);
  }
  
  return {
    variables,
    edges,
    dependencyChains,
    summary: {
      totalVariables: variables.size,
      totalDefinitions: totalDefs,
      totalUses: totalUses,
      maxChainLength: maxChain
    }
  };

  // Inline helper function to add a variable to the data flow analysis
  function addVariable(varName: string, lineNum: number, varType: 'definition' | 'use' | 'parameter' | 'return', varScope: string, varValue?: string): void {
    if (!varName || varName.length < 2) return; // Skip single chars like 'i' in loops
    
    if (!variables.has(varName)) {
      variables.set(varName, []);
    }
    
    const vars = variables.get(varName)!;
    
    // Avoid duplicates at same line
    if (!vars.some(v => v.line === lineNum && v.type === varType)) {
      vars.push({ name: varName, line: lineNum, type: varType, scope: varScope, value: varValue });
    }
  }
}

function buildDependencyChains(
  variables: Map<string, DataFlowVariable[]>,
  edges: DataFlowEdge[],
  chains: string[][]
): void {
  // Build chains from edges
  const graph = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, []);
    }
    graph.get(edge.from)!.push(edge.to);
  }
  
  // Find all paths
  const visited = new Set<string>();
  
  for (const [start] of graph) {
    if (!visited.has(start)) {
      const chain: string[] = [start];
      buildChain(start, graph, chain, chains, visited);
    }
  }
}

function buildChain(
  current: string,
  graph: Map<string, string[]>,
  chain: string[],
  chains: string[][],
  visited: Set<string>
): void {
  const next = graph.get(current);
  if (!next || next.length === 0) {
    if (chain.length > 1) {
      chains.push([...chain]);
    }
    return;
  }
  
  for (const n of next) {
    if (!chain.includes(n)) {
      chain.push(n);
      buildChain(n, graph, chain, chains, visited);
      chain.pop();
    }
  }
}

/**
 * Compare data flow patterns between two code snippets
 * Returns a similarity score based on data flow structure
 */
export function compareDataFlow(codeA: string, codeB: string, language: string): number {
  const flowA = analyzeDataFlow(codeA, language);
  const flowB = analyzeDataFlow(codeB, language);
  
  // Compare variable count
  const varCountSim = Math.min(flowA.summary.totalVariables, flowB.summary.totalVariables) /
                      Math.max(flowA.summary.totalVariables, flowB.summary.totalVariables || 1);
  
  // Compare definition/use ratio
  const ratioA = flowA.summary.totalDefinitions / (flowA.summary.totalUses || 1);
  const ratioB = flowB.summary.totalDefinitions / (flowB.summary.totalUses || 1);
  const ratioSim = 1 - Math.min(Math.abs(ratioA - ratioB), 1);
  
  // Compare dependency chain complexity
  const chainSim = Math.min(flowA.summary.maxChainLength, flowB.summary.maxChainLength) /
                   Math.max(flowA.summary.maxChainLength, flowB.summary.maxChainLength || 1);
  
  // Compare edge count (data flow connections)
  const edgeCountSim = Math.min(flowA.edges.length, flowB.edges.length) /
                       Math.max(flowA.edges.length, flowB.edges.length || 1);
  
  // Weighted combination
  const similarity = (varCountSim * 0.25 + ratioSim * 0.25 + chainSim * 0.25 + edgeCountSim * 0.25) * 100;
  
  return Math.round(similarity);
}