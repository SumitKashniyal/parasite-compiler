// Core plagiarism detection logic

// ==================== IMPROVED TOKEN INTERFACE ====================
// 2.1: Add new token types for function calls and types
export interface Token {
  type: 'keyword' | 'identifier' | 'operator' | 'literal' | 'separator' | 'function' | 'type' | 'unknown';
  value: string;
  normalized: string;
  line: number;
}

export interface ComparisonResult {
  similarity: number;
  classification: 'Low' | 'Medium' | 'High';
  matchedLines: { lineA: number; lineB: number; content: string }[];
  tokensA: Token[];
  tokensB: Token[];
  matchedTokenPairs: { indexA: number; indexB: number }[];
}

export interface MultiComparisonResult {
  fileNames: string[];
  codes: string[];
  language: string;
  pairResults: { i: number; j: number; result: ComparisonResult }[];
  matrix: number[][]; // similarity matrix
}

const KEYWORDS: Record<string, string[]> = {
  c: ['int', 'float', 'double', 'char', 'void', 'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'typedef', 'enum', 'sizeof', 'static', 'const', 'unsigned', 'signed', 'long', 'short', 'include', 'define', 'printf', 'scanf', 'main'],
  cpp: ['int', 'float', 'double', 'char', 'void', 'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'typedef', 'enum', 'sizeof', 'static', 'const', 'unsigned', 'signed', 'long', 'short', 'include', 'define', 'printf', 'scanf', 'main', 'class', 'public', 'private', 'protected', 'virtual', 'override', 'final', 'template', 'typename', 'namespace', 'using', 'new', 'delete', 'this', 'nullptr', 'true', 'false', 'bool', 'cout', 'cin', 'std', 'vector', 'string', 'map', 'iostream'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'abstract', 'void', 'int', 'float', 'double', 'char', 'boolean', 'String', 'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'break', 'continue', 'return', 'new', 'this', 'super', 'try', 'catch', 'throw', 'throws', 'import', 'package', 'System'],
  python: ['def', 'class', 'if', 'elif', 'else', 'while', 'for', 'in', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'is', 'None', 'True', 'False', 'print', 'range', 'len', 'self'],
  php: ['<?php', '?>', 'echo', 'print', 'if', 'else', 'elseif', 'while', 'for', 'foreach', 'do', 'switch', 'case', 'break', 'continue', 'return', 'function', 'class', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'extends', 'implements', 'new', 'this', 'self', 'parent', 'array', 'isset', 'empty', 'count', 'include', 'require', 'include_once', 'require_once', 'global', 'const', 'define', 'true', 'false', 'null', 'try', 'catch', 'throw', 'namespace', 'use'],
  sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER', 'BY', 'GROUP', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS', 'DISTINCT', 'TOP', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'DATABASE', 'INDEX', 'VIEW', 'PRIMARY', 'KEY', 'FOREIGN', 'CONSTRAINT', 'DEFAULT', 'UNIQUE', 'CHECK', 'AUTO_INCREMENT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']
};

// ==================== IMPROVED CONSTANTS ====================
const OPERATORS = ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '++', '--', '+=', '-=', '*=', '/=', '**'];
const SEPARATORS = ['(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '#'];

// IMPROVEMENT 2.2: Add type keywords for normalization
const TYPE_KEYWORDS = new Set([
  'int', 'float', 'double', 'char', 'void', 'bool', 'boolean',
  'long', 'short', 'unsigned', 'signed', 'size_t', 'string', 'String',
  'List', 'Array', 'Map', 'Set', 'Vector', 'ArrayList'
]);

// IMPROVEMENT 2.3: Map compound operators to normalized forms
const OPERATOR_NORMALIZATION: Record<string, string> = {
  '+=': 'OP_ASSIGNSUM',
  '-=': 'OP_ASSIGNSUB',
  '*=': 'OP_ASSIGNMUL',
  '/=': 'OP_ASSIGNDIV',
  '++': 'OP_INC',
  '--': 'OP_DEC',
  '==': 'OP_EQ',
  '!=': 'OP_NEQ',
  '<=': 'OP_LTE',
  '>=': 'OP_GTE',
  '&&': 'OP_AND',
  '||': 'OP_OR',
  '<<': 'OP_LSHIFT',
  '>>': 'OP_RSHIFT',
};

// ==================== IMPROVED PREPROCESSING ====================
// 1.1: Add whitespace normalization and numeric constant normalization

export function preprocessCode(code: string): string {
  let result = code;
  
  // Remove single-line comments
  result = result.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove preprocessor directives
  result = result.replace(/#.*$/gm, '');
  
  // Normalize string literals
  result = result.replace(/"[^"]*"/g, '"STR"');
  result = result.replace(/'[^']*'/g, "'STR'");
  
  // IMPROVEMENT 1.1: Normalize whitespace - convert all whitespace to single spaces
  result = result.replace(/\s+/g, ' ');
  
  // IMPROVEMENT 1.2: Normalize numeric constants - convert all numbers to NUM
  // Integer constants
  result = result.replace(/\b\d+\b/g, 'NUM');
  // Float/double constants  
  result = result.replace(/\b\d+\.\d+\b/g, 'NUM');
  // Hex constants
  result = result.replace(/\b0x[0-9a-fA-F]+\b/g, 'NUM');
  
  // IMPROVEMENT 1.3: Remove formatting-only differences
  // Remove leading/trailing whitespace from each line
  result = result.split('\n').map(l => l.trim()).join('\n');
  // Remove blank lines
  result = result.replace(/^\s*$/gm, '');
  // Remove lines with only braces
  result = result.replace(/^\s*[{}]\s*$/gm, '');
  
  return result;
}

// Alternative preprocessing for more aggressive normalization
export function preprocessCodeAggressive(code: string): string {
  let result = preprocessCode(code);
  // Remove all indentation
  result = result.replace(/^[\s]*/gm, '');
  // Remove extra spaces around operators
  result = result.replace(/\s*([=+\-*/%<>!&|()\[\]{};:,])\s*/g, '$1');
  return result;
}

export function tokenizeCode(code: string, language: string): Token[] {
  const preprocessed = preprocessCode(code);
  const lines = preprocessed.split('\n');
  const tokens: Token[] = [];
  const kw = KEYWORDS[language] || KEYWORDS.c;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (!line) continue;

    const tokenRegex = /([a-zA-Z_]\w*)|(\d+\.?\d*)|([+\-*/%=!<>&|^~]+)|([(){}[\];,.:# ])/g;
    let match;

    while ((match = tokenRegex.exec(line)) !== null) {
      const value = match[0].trim();
      if (!value) continue;

      let type: Token['type'] = 'unknown';
      let normalized = value;

      if (kw.includes(value)) {
        type = 'keyword';
        normalized = value;
      } else if (/^[a-zA-Z_]\w*$/.test(value)) {
        type = 'identifier';
        normalized = 'VAR';
      } else if (/^\d+\.?\d*$/.test(value)) {
        type = 'literal';
        normalized = 'NUM';
      } else if (OPERATORS.some(op => value.includes(op))) {
        type = 'operator';
        normalized = value;
      } else if (SEPARATORS.includes(value)) {
        type = 'separator';
        normalized = value;
      }

      if (type !== 'unknown') {
        tokens.push({ type, value, normalized, line: lineNum + 1 });
      }
    }
  }

  return tokens;
}

export function compareTokens(tokensA: Token[], tokensB: Token[]): { similarity: number; matchedPairs: { indexA: number; indexB: number }[] } {
  const seqA = tokensA.map(t => t.normalized);
  const seqB = tokensB.map(t => t.normalized);

  const n = 3;
  const gramsA = new Map<string, number[]>();
  const gramsB = new Map<string, number[]>();

  for (let i = 0; i <= seqA.length - n; i++) {
    const gram = seqA.slice(i, i + n).join('|');
    if (!gramsA.has(gram)) gramsA.set(gram, []);
    gramsA.get(gram)!.push(i);
  }

  for (let i = 0; i <= seqB.length - n; i++) {
    const gram = seqB.slice(i, i + n).join('|');
    if (!gramsB.has(gram)) gramsB.set(gram, []);
    gramsB.get(gram)!.push(i);
  }

  let matchedCount = 0;
  const matchedPairs: { indexA: number; indexB: number }[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  for (const [gram, positionsA] of gramsA) {
    const positionsB = gramsB.get(gram);
    if (!positionsB) continue;

    for (const posA of positionsA) {
      for (const posB of positionsB) {
        let matched = false;
        for (let k = 0; k < n; k++) {
          if (!usedA.has(posA + k) && !usedB.has(posB + k)) {
            matched = true;
          }
        }
        if (matched) {
          for (let k = 0; k < n; k++) {
            if (!usedA.has(posA + k) && !usedB.has(posB + k)) {
              usedA.add(posA + k);
              usedB.add(posB + k);
              matchedPairs.push({ indexA: posA + k, indexB: posB + k });
              matchedCount++;
            }
          }
          break;
        }
      }
    }
  }

  const totalTokens = Math.max(seqA.length, seqB.length);
  const similarity = totalTokens === 0 ? 0 : (matchedCount / totalTokens) * 100;

  return { similarity: Math.min(Math.round(similarity * 10) / 10, 100), matchedPairs };
}

export function findMatchedLines(codeA: string, codeB: string): { lineA: number; lineB: number; content: string }[] {
  const linesA = codeA.split('\n').map(l => l.trim()).filter(Boolean);
  const linesB = codeB.split('\n').map(l => l.trim()).filter(Boolean);
  const matches: { lineA: number; lineB: number; content: string }[] = [];

  for (let i = 0; i < linesA.length; i++) {
    const normalizedA = linesA[i].replace(/\s+/g, ' ').toLowerCase();
    if (normalizedA.length < 3) continue;
    for (let j = 0; j < linesB.length; j++) {
      const normalizedB = linesB[j].replace(/\s+/g, ' ').toLowerCase();
      if (normalizedA === normalizedB) {
        matches.push({ lineA: i + 1, lineB: j + 1, content: linesA[i] });
      }
    }
  }

  return matches;
}

export function analyzeCode(codeA: string, codeB: string, language: string): ComparisonResult {
  const tokensA = tokenizeCode(codeA, language);
  const tokensB = tokenizeCode(codeB, language);
  const { similarity, matchedPairs } = compareTokens(tokensA, tokensB);
  const matchedLines = findMatchedLines(codeA, codeB);

  let classification: 'Low' | 'Medium' | 'High';
  if (similarity < 30) classification = 'Low';
  else if (similarity < 65) classification = 'Medium';
  else classification = 'High';

  return {
    similarity,
    classification,
    matchedLines,
    tokensA,
    tokensB,
    matchedTokenPairs: matchedPairs,
  };
}

// ==================== AST COMPARISON MODULE ====================
export interface ASTNode {
  type: string;
  start: number;
  end: number;
  children: ASTNode[];
  hash: string;
  normalizedHash: string;
  name?: string;
  line: number;
}

export interface PlagiarismType {
  type: 'verbatim' | 'renamed' | 'rearranged' | 'structural' | 'none';
  confidence: number;
  description: string;
}

export interface ASTComparisonResult {
  structuralSimilarity: number;
  nodeMatches: { nodeA: ASTNode; nodeB: ASTNode; similarity: number }[];
  plagiarismType: PlagiarismType;
  ignoredNodes: number;
}

// JavaScript/TypeScript AST normalizer - resistant to obfuscation
function normalizeASTNode(node: any, depth: number = 0): ASTNode {
  const children: ASTNode[] = [];
  let hashBase = node.type;
  
  // Normalize identifiers, ignore variable names
  if (node.type === 'Identifier' || node.type === 'VariableDeclaration') {
    hashBase += '|VAR';
  } else if (node.type === 'Literal') {
    hashBase += '|LIT';
  } else if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
    hashBase += '|FN';
  }

  // Recursively normalize children
  for (const key in node) {
    if (typeof node[key] === 'object' && node[key] !== null) {
      if (Array.isArray(node[key])) {
        for (const child of node[key]) {
          if (child && typeof child.type === 'string') {
            children.push(normalizeASTNode(child, depth + 1));
          }
        }
      } else if (typeof node[key].type === 'string') {
        children.push(normalizeASTNode(node[key], depth + 1));
      }
    }
  }

  // Sort children for rearrangement resistance
  const sortedChildren = [...children].sort((a, b) => a.normalizedHash.localeCompare(b.normalizedHash));
  const childHashes = sortedChildren.map(c => c.normalizedHash).join(',');
  
  return {
    type: node.type,
    start: node.start || 0,
    end: node.end || 0,
    line: node.loc?.start?.line || 0,
    children,
    hash: `${node.type}:${children.map(c => c.hash).join(',')}`,
    normalizedHash: `${hashBase}:${childHashes}`,
    name: node.name?.name || node.id?.name
  };
}

// Structure-aware AST comparison
export function compareAST(codeA: string, codeB: string, language: string): ASTComparisonResult {
  // Simple fallback AST parser for JS/TS when full parser not available
  const parseSimpleAST = (code: string): ASTNode => {
    const root: ASTNode = { type: 'Program', start: 0, end: code.length, line: 1, children: [], hash: '', normalizedHash: '' };
    const tokens = tokenizeCode(code, language);
    
    // Build block structure
    let currentNode = root;
    const stack: ASTNode[] = [root];
    let line = 1;
    
    for (const token of tokens) {
      if (token.value === '{') {
        const block: ASTNode = { type: 'BlockStatement', start: token.line, end: 0, line: token.line, children: [], hash: '', normalizedHash: '' };
        currentNode.children.push(block);
        stack.push(currentNode);
        currentNode = block;
      } else if (token.value === '}') {
        currentNode.end = token.line;
        if (stack.length > 1) currentNode = stack.pop()!;
      } else if (token.type === 'keyword') {
        const stmt: ASTNode = { type: token.value, start: token.line, end: token.line, line: token.line, children: [], hash: '', normalizedHash: '' };
        currentNode.children.push(stmt);
      }
      line = token.line;
    }
    
    // Compute hashes bottom-up
    const computeHashes = (node: ASTNode): void => {
      for (const child of node.children) computeHashes(child);
      node.hash = `${node.type}:${node.children.map(c => c.hash).join(',')}`;
      node.normalizedHash = `${node.type.slice(0,3)}:${node.children.map(c => c.normalizedHash).sort().join(',')}`;
    };
    computeHashes(root);
    
    return root;
  };

  const astA = parseSimpleAST(codeA);
  const astB = parseSimpleAST(codeB);

  const nodeMatches: { nodeA: ASTNode; nodeB: ASTNode; similarity: number }[] = [];
  const hashMap = new Map<string, ASTNode[]>();

  // Index all nodes by normalized hash
  const indexNodes = (node: ASTNode) => {
    if (!hashMap.has(node.normalizedHash)) hashMap.set(node.normalizedHash, []);
    hashMap.get(node.normalizedHash)!.push(node);
    for (const child of node.children) indexNodes(child);
  };
  indexNodes(astB);

  let matchedNodes = 0;
  let totalNodes = 0;

  const matchNodes = (node: ASTNode): number => {
    totalNodes++;
    const matches = hashMap.get(node.normalizedHash) || [];
    if (matches.length > 0) {
      nodeMatches.push({ nodeA: node, nodeB: matches[0], similarity: 1 });
      matchedNodes++;
      matches.shift();
    }
    let childMatches = 0;
    for (const child of node.children) childMatches += matchNodes(child);
    return childMatches;
  };
  matchNodes(astA);

  const structuralSimilarity = totalNodes > 0 ? Math.round((matchedNodes / totalNodes) * 1000) / 10 : 0;
  
  // Classify plagiarism type
  let plagiarismType: PlagiarismType = { type: 'none', confidence: 0, description: 'No significant similarity detected' };
  
  if (structuralSimilarity > 85) {
    plagiarismType = { type: 'verbatim', confidence: 95, description: 'Exact or near-exact copy with minimal changes' };
  } else if (structuralSimilarity > 70) {
    plagiarismType = { type: 'renamed', confidence: 85, description: 'Variables/identifiers renamed but structure preserved' };
  } else if (structuralSimilarity > 55) {
    plagiarismType = { type: 'rearranged', confidence: 75, description: 'Logic rearranged, order changed but operations identical' };
  } else if (structuralSimilarity > 40) {
    plagiarismType = { type: 'structural', confidence: 60, description: 'Similar algorithmic structure, different implementation' };
  }

  return {
    structuralSimilarity,
    nodeMatches,
    plagiarismType,
    ignoredNodes: 0
  };
}

// ==================== CODE WHITELISTING ====================
// Common boilerplate patterns for all supported languages
const BOILERPLATE_PATTERNS: RegExp[] = [
  // JavaScript/TypeScript
  /^import\s+.*from\s+['"].*['"];?$/,
  /^export\s+(default\s+)?(class|function|interface|type|const|let|var)/,
  /^['"]use strict['"];?$/,
  /^console\.(log|warn|error|info)\(/,
  
  // C/C++
  /^#include\s+<.*>$/,
  /^#define\s+\w+/,
  /^#ifndef\s+\w+/,
  /^#endif$/,
  /^extern\s+"C"/,
  /^using\s+namespace\s+std;?$/, // C++ namespace std
  /^using\s+std::/,
  /^#include\s+"[\w./]+"$/,
  /^#pragma\s+/,
  
  // Java
  /^package\s+[\w.]+;$/,
  /^import\s+[\w.]+;$/,
  /^public\s+static\s+void\s+main\s*\(/,
  /^public\s+class\s+\w+/,
  /^private\s+(static\s+)?final\s+/,
  /^@Override$/,
  /^@SuppressWarnings/,
  
  // Python
  /^#.*$/,
  /^from\s+\w+\s+import\s+/,
  /^import\s+\w+/,
  /^if\s+__name__\s*==\s*['"]__main__['"]:/,
  /^#\s*!/,
  
  // PHP
  /^<\?php$/,
  /^\?>$/,
  /^(echo|print)\s+/,
  /^(require|include)(_once)?\s+['"]/,
  /^namespace\s+[\w\\]+;?$/,
  /^use\s+[\w\\]+;?$/,
  
  // SQL
  /^CREATE\s+TABLE\s+\w+/,
  /^CREATE\s+INDEX\s+\w+/,
  /^ALTER\s+TABLE\s+\w+/,
  /^DROP\s+TABLE\s+\w+/,
  /^USE\s+\w+/i,
  
  // Universal
  /^\/\/.*$/,
  /^\/\*[\s\S]*?\*\//,
  /^\s*$/,
];

// Additional patterns for boilerplate code that appears at the START of code
// This catches things like point counts, headers, initial declarations
const START_BOILERPLATE_PATTERNS: RegExp[] = [
  // Common point/count patterns
  /^\s*\/\/\s*\d+\s*points?\s*$/i,
  /^\s*\/\/\s*points?:?\s*\d+\s*$/i,
  /^\s*\/\*\s*\d+\s*points?\s*\*\/$/i,
  /^\s*#\s*\d+\s*points?\s*$/i,
  
  // Author/date headers
  /^\s*\/\/\s*Author:.*$/i,
  /^\s*\/\/\s*Date:.*$/i,
  /^\s*\/\/\s*@author.*$/i,
  /^\s*\/\/\s*Created:.*$/i,
  /^\s*\/\*\s*Author:.*\*\/$/i,
  /^\s*\/\*\s*Date:.*\*\/$/i,
  
  // Copyright headers
  /^\s*\/\/\s*Copyright.*$/i,
  /^\s*\/\*\s*Copyright.*\*\/$/i,
  
  // Assignment/lab headers
  /^\s*\/\/\s*Assignment.*$/i,
  /^\s*\/\/\s*Lab.*$/i,
  /^\s*\/\/\s*Exercise.*$/i,
  
  // Description comments
  /^\s*\/\/\s*Description:.*$/i,
  /^\s*\/\/\s*Purpose:.*$/i,
  
  // Empty or whitespace-only lines at start
  /^\s*$/,
];

// Language-specific whitelisting - enhanced with more patterns for all supported languages
export const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  c: [
    /^#include\s+</,
    /^#define\s+/,
    /^#ifndef\s+/,
    /^#ifdef\s+/,
    /^#endif$/,
    /^#pragma\s+/,
    /^#if\s+/,
    /^#else$/,
    /^#elif\s+/,
    /^int\s+main\s*\(/,      // C main function
    /^void\s+main\s*\(/,     // void main
    /^int\s+main\(void\)/,   // main with void
  ],
  cpp: [
    /^#include\s+</,
    /^#define\s+/,
    /^#ifndef\s+/,
    /^#ifdef\s+/,
    /^#endif$/,
    /^#pragma\s+/,
    /^#if\s+/,
    /^#else$/,
    /^#elif\s+/,
    /^using\s+namespace\s+std/,
    /^using\s+std::/,
    /^#include\s+"[\w./]+"/,
    /^int\s+main\s*\(/,      // C++ main function
    /^void\s+main\s*\(/,     // void main
    /^int\s+main\(void\)/,
  ],
  java: [
    /^package\s+[\w.]+/,
    /^import\s+[\w.]+/,
    /^import\s+java\./,
    /^public\s+(static\s+)?class\s+\w+/,
    /^public\s+static\s+void\s+main\s*\(/,
    /^public\s+(final\s+)?class\s+/,
    /^private\s+(static\s+)?final\s+/,
    /^class\s+\w+\s+(extends|implements)/,
    /^@Override$/,
    /^@SuppressWarnings/,
  ],
  python: [
    /^import\s+\w+/,
    /^from\s+\w+\s+import/,
    /^from\s+\w+\.\w+\s+import/,
    /^if\s+__name__\s*==\s*['"]__main__['"]:/,
    /^#\s*!/,
    /^@\w+$/,
    /^def\s+__init__/,
    /^def\s+main\s*\(/,
  ],
  javascript: [
    /^import\s+.*\s+from\s+['"].*['"]/,
    /^export\s+(default\s+)?(function|class|const|let|var)/,
    /^export\s*\{/,
    /^require\s*\(/,
    /^module\.exports/,
    /^const\s+.*\s*=\s*require\s*\(/,
    /^let\s+.*\s*=\s*require\s*\(/,
  ],
  typescript: [
    /^import\s+.*\s+from\s+['"].*['"]/,
    /^export\s+(default\s+)?(class|interface|type|const|let|var)/,
    /^export\s*\{/,
    /^import\s+\{.*\}\s+from/,
    /^import\s+type\s+/,
    /^interface\s+\w+/,
    /^type\s+\w+\s*=/,
  ],
  php: [
    /^<\?php$/,
    /^\?>$/,
    /^namespace\s+[\w\\]+/,
    /^use\s+[\w\\]+/,
    /^use\s+function\s+/,
    /^(require|include)(_once)?\s+['"]/,
    /^(require|include)(_once)?\s*\(/,
    /^class\s+\w+\s+(extends|implements)/,
    /^const\s+\w+\s*=/,
  ],
  sql: [
    /^CREATE\s+TABLE\s+/i,
    /^CREATE\s+INDEX\s+/i,
    /^CREATE\s+(UNIQUE\s+)?(INDEX|PROCEDURE|FUNCTION|VIEW|TRIGGER)/i,
    /^ALTER\s+TABLE\s+/i,
    /^ALTER\s+(INDEX|PROCEDURE|FUNCTION)/i,
    /^DROP\s+TABLE\s+/i,
    /^DROP\s+(INDEX|PROCEDURE|FUNCTION|VIEW|TRIGGER)/i,
    /^USE\s+\w+/i,
    /^SET\s+@@/i,
    /^SET\s+ANSI_NULLS/i,
  ]
};

export function filterWhitelistedCode(code: string, language?: string): string {
  const lines = code.split('\n');
  
  // First, filter out boilerplate from the START of the code (leading headers, points, etc.)
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line matches any start boilerplate pattern
    const isBoilerplate = START_BOILERPLATE_PATTERNS.some(pattern => pattern.test(line));
    if (isBoilerplate) {
      startIndex = i + 1;
    } else {
      // Stop at first non-boilerplate line
      break;
    }
  }
  
  // Now filter the remaining lines using the general patterns AND language-specific patterns
  const languageKey = language || 'c';
  const langPatterns = LANGUAGE_PATTERNS[languageKey] || [];
  
  const filteredLines = lines.slice(startIndex).filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Check against general BOILERPLATE_PATTERNS
    const matchesGeneral = BOILERPLATE_PATTERNS.some(pattern => pattern.test(trimmed));
    if (matchesGeneral) return false;
    
    // Check against language-specific patterns
    const matchesLang = langPatterns.some(pattern => {
      try {
        return pattern.test(trimmed);
      } catch {
        return false;
      }
    });
    if (matchesLang) return false;
    
    return true;
  });
  
  return filteredLines.join('\n');
}

// ==================== EXTENDED ANALYSIS WITH AST ====================
export interface EnhancedComparisonResult extends ComparisonResult {
  astResult?: ASTComparisonResult;
  combinedSimilarity: number;
}

// ==================== IMPROVED FINAL SCORING ====================
// 9: Balanced weighted scoring model

// Simple control flow comparison
function compareControlFlowSimple(codeA: string, codeB: string): number {
  const flowA = extractControlFlowSimple(codeA);
  const flowB = extractControlFlowSimple(codeB);
  
  if (!flowA || !flowB) return 0;
  
  const typesA = new Set(flowA);
  const typesB = new Set(flowB);
  
  let matches = 0;
  for (const t of typesA) {
    if (typesB.has(t)) matches++;
  }
  const total = Math.max(typesA.size, typesB.size);
  return total > 0 ? (matches / total) * 100 : 0;
}

function extractControlFlowSimple(code: string): string[] {
  const structures: string[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('if')) structures.push('IF');
    else if (trimmed.startsWith('for') || trimmed.startsWith('while')) structures.push('LOOP');
    else if (trimmed.startsWith('switch')) structures.push('SWITCH');
    else if (trimmed.startsWith('return')) structures.push('RETURN');
    else if (trimmed.match(/^\w+\(.*\)$/)) structures.push('CALL');
  }
  
  return structures;
}

interface SimpleFlow { varCount: number; maxDepth: number; }
function analyzeDataFlowSimple(code: string): SimpleFlow | null {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;
  const vars = new Set<string>();
  
  for (const line of lines) {
    const varMatch = line.match(/\b(int|float|double|char|var|let|const)\s+(\w+)/);
    if (varMatch) {
      vars.add(varMatch[2]);
    }
    for (const char of line) {
      if (char === '{') currentDepth++;
      if (char === '}') currentDepth--;
    }
    maxDepth = Math.max(maxDepth, currentDepth);
  }
  
  return { varCount: vars.size, maxDepth };
}

function compareDataFlowScores(codeA: string, codeB: string, language: string): number {
  const flowA = analyzeDataFlowSimple(codeA);
  const flowB = analyzeDataFlowSimple(codeB);
  
  if (!flowA || !flowB) return 0;
  
  const varSim = Math.min(flowA.varCount, flowB.varCount) / Math.max(flowA.varCount, flowB.varCount || 1);
  const depthSim = Math.min(flowA.maxDepth, flowB.maxDepth) / Math.max(flowA.maxDepth, flowB.maxDepth || 1);
  
  return (varSim * 0.5 + depthSim * 0.5) * 100;
}

export function analyzeCodeEnhanced(codeA: string, codeB: string, language: string): EnhancedComparisonResult {
  const filteredA = filterWhitelistedCode(codeA, language);
  const filteredB = filterWhitelistedCode(codeB, language);
  
  const tokensA = tokenizeCode(filteredA, language);
  const tokensB = tokenizeCode(filteredB, language);
  const { similarity: tokenSimilarity, matchedPairs } = compareTokens(tokensA, tokensB);
  
  const matchedLines = findMatchedLinesLCS(filteredA, filteredB);
  const astResult = compareAST(filteredA, filteredB, language);
  
  const dataFlowSimilarity = compareDataFlowScores(filteredA, filteredB, language);
  const controlFlowSimilarity = compareControlFlowSimple(filteredA, filteredB);
  
  // IMPROVEMENT 9: Balanced weighted scoring model
  // AST similarity           → 35%
  // Token similarity         → 25%  
  // Control flow similarity  → 20%
  // Data flow similarity    → 10%
  // Line similarity        → 10%
  const combinedSimilarity = Math.round(
    (astResult.structuralSimilarity * 0.35) +
    (tokenSimilarity * 0.25) +
    (controlFlowSimilarity * 0.20) +
    (dataFlowSimilarity * 0.10) +
    (matchedLines.length > 0 ? Math.min(100, matchedLines.length * 5) * 0.10 : 0)
  );

  let classification: 'Low' | 'Medium' | 'High';
  if (combinedSimilarity < 30) classification = 'Low';
  else if (combinedSimilarity < 65) classification = 'Medium';
  else classification = 'High';

  return {
    similarity: tokenSimilarity,
    classification,
    matchedLines,
    tokensA,
    tokensB,
    matchedTokenPairs: matchedPairs,
    astResult,
    combinedSimilarity
  };
}

export function analyzeMultiple(codes: string[], fileNames: string[], language: string): MultiComparisonResult {
  const n = codes.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const pairResults: { i: number; j: number; result: ComparisonResult }[] = [];

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 100;
    for (let j = i + 1; j < n; j++) {
      // Filter boilerplate before analysis
      const filteredA = filterWhitelistedCode(codes[i], language);
      const filteredB = filterWhitelistedCode(codes[j], language);
      const result = analyzeCode(filteredA, filteredB, language);
      matrix[i][j] = result.similarity;
      matrix[j][i] = result.similarity;
      pairResults.push({ i, j, result });
    }
  }

  return { fileNames, codes, language, pairResults, matrix };
}

// Enhanced multi-analysis with AST and clustering
// 11.1: Use clustering to group similar submissions
export function analyzeMultipleEnhanced(codes: string[], fileNames: string[], language: string): MultiComparisonResult {
  const n = codes.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const pairResults: { i: number; j: number; result: ComparisonResult }[] = [];

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 100;
    for (let j = i + 1; j < n; j++) {
      const filteredA = filterWhitelistedCode(codes[i], language);
      const filteredB = filterWhitelistedCode(codes[j], language);
      const enhancedResult = analyzeCodeEnhanced(filteredA, filteredB, language);
      const result: ComparisonResult = {
        similarity: enhancedResult.similarity,
        classification: enhancedResult.classification,
        matchedLines: enhancedResult.matchedLines,
        tokensA: enhancedResult.tokensA,
        tokensB: enhancedResult.tokensB,
        matchedTokenPairs: enhancedResult.matchedTokenPairs
      };
      matrix[i][j] = enhancedResult.combinedSimilarity;
      matrix[j][i] = enhancedResult.combinedSimilarity;
      pairResults.push({ i, j, result });
    }
  }

  return { fileNames, codes, language, pairResults, matrix };
}

// All new functions are already exported via their export declarations above

// ==================== REPORT GENERATION DATA STRUCTURE ====================
export interface ReportSection {
  title: string;
  content: string;
  type: 'text' | 'chart' | 'code' | 'table';
  data?: any;
}

export function generateReportData(result: EnhancedComparisonResult, fileNameA: string, fileNameB: string): ReportSection[] {
  return [
    { title: 'Similarity Overview', type: 'text', content: `Combined similarity score: ${result.combinedSimilarity}%` },
    { title: 'Structural Similarity', type: 'chart', content: 'AST structure match rate', data: { value: result.astResult?.structuralSimilarity || 0 } },
    { title: 'Token Similarity', type: 'chart', content: 'Token sequence match rate', data: { value: result.similarity } },
    { title: 'Plagiarism Classification', type: 'text', content: `${result.astResult?.plagiarismType.description} (Confidence: ${result.astResult?.plagiarismType.confidence}%)` },
    { title: 'Matched Code Segments', type: 'table', content: `${result.matchedLines.length} matching lines found`, data: result.matchedLines }
  ];
}

// ==================== NETWORK GRAPH DATA ====================
export interface GraphNode {
  id: string;
  label: string;
  size: number;
  group: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  value: number;
}

export function generateNetworkGraph(result: MultiComparisonResult): { nodes: GraphNode[], edges: GraphEdge[] } {
  const nodes: GraphNode[] = result.fileNames.map((name, i) => ({
    id: `file-${i}`,
    label: name,
    size: 20,
    group: Math.floor(i / 3)
  }));

  const edges: GraphEdge[] = result.pairResults.map(pair => ({
    source: `file-${pair.i}`,
    target: `file-${pair.j}`,
    weight: pair.result.similarity / 100,
    value: pair.result.similarity
  })).filter(e => e.value > 20);

  return { nodes, edges };
}

// ==================== DIFF HIGHLIGHTING HELPER ====================
export interface DiffSegment {
  type: 'match' | 'mismatch' | 'insert' | 'delete';
  content: string;
  lineA?: number;
  lineB?: number;
}

// ==================== IMPROVED N-GRAM MATCHING ====================
// 3.1: Multiple n-grams (2,3,4-gram) with weighted scoring

export function compareTokensWeighted(tokensA: Token[], tokensB: Token[]): { similarity: number; matchedPairs: { indexA: number; indexB: number }[] } {
  const seqA = tokensA.map(t => t.normalized);
  const seqB = tokensB.map(t => t.normalized);
  
  const ngrams = [2, 3, 4]; // 2-gram, 3-gram, 4-gram
  const weights = [0.3, 0.4, 0.3]; // Weights for bi, tri, four-grams
  
  const matchCounts: number[] = [];
  
  for (const n of ngrams) {
    const gramsA = new Map<string, number[]>();
    const gramsB = new Map<string, number[]>();
    
    for (let i = 0; i <= seqA.length - n; i++) {
      const gram = seqA.slice(i, i + n).join('|');
      if (!gramsA.has(gram)) gramsA.set(gram, []);
      gramsA.get(gram)!.push(i);
    }
    
    for (let i = 0; i <= seqB.length - n; i++) {
      const gram = seqB.slice(i, i + n).join('|');
      if (!gramsB.has(gram)) gramsB.set(gram, []);
      gramsB.get(gram)!.push(i);
    }
    
    let matched = 0;
    const usedA = new Set<number>();
    const usedB = new Set<number>();
    
    for (const [gram, positionsA] of gramsA) {
      const positionsB = gramsB.get(gram);
      if (!positionsB) continue;
      
      for (const posA of positionsA) {
        for (const posB of positionsB) {
          let valid = true;
          for (let k = 0; k < n; k++) {
            if (usedA.has(posA + k) || usedB.has(posB + k)) {
              valid = false;
              break;
            }
          }
          if (valid) {
            for (let k = 0; k < n; k++) {
              usedA.add(posA + k);
              usedB.add(posB + k);
            }
            matched++;
            break;
          }
        }
      }
    }
    matchCounts.push(matched);
  }
  
  // Calculate weighted similarity
  let weightedScore = 0;
  for (let i = 0; i < ngrams.length; i++) {
    const maxTokens = Math.max(seqA.length, seqB.length);
    const similarity = maxTokens > 0 ? (matchCounts[i] / maxTokens) * 100 : 0;
    weightedScore += similarity * weights[i];
  }
  
  // Get matched pairs using best n-gram (3-gram)
  const matchedPairs = getMatchedPairs(seqA, seqB, 3);
  
  return { similarity: Math.round(weightedScore * 10) / 10, matchedPairs };
}

function getMatchedPairs(seqA: string[], seqB: string[], n: number): { indexA: number; indexB: number }[] {
  const gramsA = new Map<string, number[]>();
  const gramsB = new Map<string, number[]>();
  
  for (let i = 0; i <= seqA.length - n; i++) {
    const gram = seqA.slice(i, i + n).join('|');
    if (!gramsA.has(gram)) gramsA.set(gram, []);
    gramsA.get(gram)!.push(i);
  }
  
  for (let i = 0; i <= seqB.length - n; i++) {
    const gram = seqB.slice(i, i + n).join('|');
    if (!gramsB.has(gram)) gramsB.set(gram, []);
    gramsB.get(gram)!.push(i);
  }
  
  const matchedPairs: { indexA: number; indexB: number }[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  
  for (const [gram, positionsA] of gramsA) {
    const positionsB = gramsB.get(gram);
    if (!positionsB) continue;
    
    for (const posA of positionsA) {
      for (const posB of positionsB) {
        let valid = true;
        for (let k = 0; k < n; k++) {
          if (usedA.has(posA + k) || usedB.has(posB + k)) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let k = 0; k < n; k++) {
            usedA.add(posA + k);
            usedB.add(posB + k);
            matchedPairs.push({ indexA: posA + k, indexB: posB + k });
          }
          break;
        }
      }
    }
  }
  
  return matchedPairs;
}

// ==================== IMPROVED LINE MATCHING ====================
// 4.1: Use Longest Common Subsequence (LCS) instead of exact line equality

export function findMatchedLinesLCS(codeA: string, codeB: string): { lineA: number; lineB: number; content: string }[] {
  const linesA = codeA.split('\n').map(l => l.trim()).filter(Boolean);
  const linesB = codeB.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Normalize lines for comparison
  const normA = linesA.map(l => l.replace(/\s+/g, ' ').toLowerCase().trim());
  const normB = linesB.map(l => l.replace(/\s+/g, ' ').toLowerCase().trim());
  
  // Build LCS table
  const m = normA.length;
  const n = normB.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normA[i - 1] === normB[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find matching lines
  const matches: { lineA: number; lineB: number; content: string }[] = [];
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    if (normA[i - 1] === normB[j - 1]) {
      matches.unshift({ lineA: i, lineB: j, content: linesA[i - 1] });
      i--;
      j--;
    } else if (lcs[i - 1][j] > lcs[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return matches;
}

export function generateSideBySideDiff(codeA: string, codeB: string, matches: { lineA: number; lineB: number }[]): { left: DiffSegment[], right: DiffSegment[] } {
  const linesA = codeA.split('\n');
  const linesB = codeB.split('\n');
  
  const matchedLinesA = new Set(matches.map(m => m.lineA));
  const matchedLinesB = new Set(matches.map(m => m.lineB));

  const left: DiffSegment[] = linesA.map((content, i) => ({
    type: matchedLinesA.has(i + 1) ? 'match' : 'mismatch',
    content,
    lineA: i + 1
  }));

  const right: DiffSegment[] = linesB.map((content, i) => ({
    type: matchedLinesB.has(i + 1) ? 'match' : 'mismatch',
    content,
    lineB: i + 1
  }));


  return { left, right };
}

// ==================== IMPROVED FINGERPRINTING ====================
// 7: Winnowing algorithm (used in MOSS)

export interface WinnowingFingerprint {
  hash: number;
  positions: number[];
  windowStart: number;
}

export function generateWinnowingFingerprints(
  tokens: Token[],
  windowSize: number = 5,
  prime: number = 1000003
): WinnowingFingerprint[] {
  const normalizedTokens = tokens.map(t => t.normalized);
  const fingerprints: WinnowingFingerprint[] = [];
  
  // Generate hashes for each window position
  for (let i = 0; i <= normalizedTokens.length - windowSize; i++) {
    let hash = 0;
    const window = normalizedTokens.slice(i, i + windowSize);
    
    // Compute polynomial rolling hash
    for (let j = 0; j < window.length; j++) {
      const charCode = window[j].charCodeAt(0) % prime;
      hash = (hash * prime + charCode) % Number.MAX_SAFE_INTEGER;
    }
    
    // Only keep fingerprints at regular intervals (winnowing)
    if (i % windowSize === 0) {
      fingerprints.push({
        hash,
        positions: [i],
        windowStart: i
      });
    }
  }
  
  return fingerprints;
}

// Prefilter using fingerprints (Improvement 7.1)
export function prefilterWithFingerprints(
  fpA: WinnowingFingerprint[],
  fpB: WinnowingFingerprint[]
): boolean {
  let common = 0;
  
  for (const fA of fpA) {
    for (const fB of fpB) {
      if (fA.hash === fB.hash) {
        common++;
        break;
      }
    }
  }
  
  // If more than 20% fingerprints match, warrant detailed comparison
  const totalA = fpA.length;
  return totalA > 0 && (common / totalA) > 0.2;
}

// ==================== IMPROVED MULTI-FILE CLUSTERING ====================
// 11: Cluster similar submissions

export interface PlagiarismCluster {
  id: number;
  files: number[];
  averageSimilarity: number;
}

export function clusterSimilarSubmissions(
  fileNames: string[],
  matrix: number[][],
  threshold: number = 50
): PlagiarismCluster[] {
  const n = fileNames.length;
  const visited = new Set<number>();
  const clusters: PlagiarismCluster[] = [];
  let clusterId = 0;
  
  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    
    const cluster: number[] = [i];
    let totalSim = 0;
    let count = 0;
    
    for (let j = i + 1; j < n; j++) {
      if (visited.has(j)) continue;
      
      const sim = matrix[i]?.[j] || 0;
      if (sim >= threshold) {
        cluster.push(j);
        visited.add(j);
        totalSim += sim;
        count++;
      }
    }
    
    if (cluster.length > 1) {
      visited.add(i);
      clusters.push({
        id: clusterId++,
        files: cluster,
        averageSimilarity: count > 0 ? Math.round(totalSim / count) : 100
      });
    }
  }
  
  return clusters;
}

// ==================== ADVANCED OBFUSCATION DETECTION ====================
// 12: Detect loop equivalence, condition inversion, function extraction

interface ObfuscationResult {
  detected: boolean;
  type: 'loop_equivalence' | 'condition_inversion' | 'function_extraction' | 'statement_reorder' | 'none';
  confidence: number;
}

export function detectObfuscation(codeA: string, codeB: string): ObfuscationResult {
  // Detect loop equivalence (for ↔ while conversion)
  if (detectLoopEquivalence(codeA, codeB)) {
    return { detected: true, type: 'loop_equivalence', confidence: 85 };
  }
  
  // Detect condition inversion (if/else swap)
  if (detectConditionInversion(codeA, codeB)) {
    return { detected: true, type: 'condition_inversion', confidence: 70 };
  }
  
  // Detect function extraction
  if (detectFunctionExtraction(codeA, codeB)) {
    return { detected: true, type: 'function_extraction', confidence: 75 };
  }
  
  return { detected: false, type: 'none', confidence: 0 };
}

function detectLoopEquivalence(codeA: string, codeB: string): boolean {
  // Check if one uses for and other uses while
  const hasForA = codeA.includes('for');
  const hasForB = codeB.includes('for');
  const hasWhileA = codeA.includes('while');
  const hasWhileB = codeB.includes('while');
  
  return (hasForA && hasWhileB) || (hasWhileA && hasForB);
}

function detectConditionInversion(codeA: string, codeB: string): boolean {
  // Check for if/else swap patterns
  const swapA = codeA.match(/if\s*\([^)]+\)\s*[^}]*else/);
  const swapB = codeB.match(/if\s*\([^)]+\)\s*[^}]*else/);
  
  // If both have if/else but in different order
  return !!swapA && !!swapB && swapA[0] !== swapB[0];
}

function detectFunctionExtraction(codeA: string, codeB: string): boolean {
  // Detect if a block was extracted to a function
  const funcCountA = (codeA.match(/\bdef\s+\w+|\bfunction\s+\w+/g) || []).length;
  const funcCountB = (codeB.match(/\bdef\s+\w+|\bfunction\s+\w+/g) || []).length;
  
  return Math.abs(funcCountA - funcCountB) >= 2;
}
