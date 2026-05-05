# PARASITE - Compiler-Based Plagiarism Detection System

## Technical Documentation

This document explains the algorithms and implementation details of PARASITE for presentation and educational purposes.

---

## 1. Overview

PARASITE is a source code plagiarism detection system that analyzes structural similarity between code files. Unlike text-based comparators, it understands code structure through tokenization, AST analysis, and control flow extraction.

**Supported Languages:** C, C++, Java, Python, PHP, SQL

---

## 2. Preprocessing Pipeline

Before analysis, code is normalized to remove formatting differences.

### 2.1 Comment Removal
```javascript
// Single-line:  result.replace(/\/\/.*$/gm, '')
// Multi-line:   result.replace(/\/\*[\s\S]*?\*\//g, '')
```

### 2.2 Preprocessor Removal (C/C++)
```javascript
result.replace(/#.*$/gm, '')  // Remove #include, #define, etc.
```

### 2.3 String Literal Normalization
```javascript
result.replace(/"[^"]*"/g, '"STR"')   // "hello" → "STR"
result.replace(/'[^']*'/g, "'STR'")   // 'x' → 'STR'
```

### 2.4 Whitespace Normalization
```javascript
result.replace(/\s+/g, ' ')  // Multiple spaces → single space
```

### 2.5 Numeric Constant Normalization
```javascript
result.replace(/\b\d+\b/g, 'NUM')        // 10, 20 → NUM
result.replace(/\b\d+\.\d+\b/g, 'NUM')     // 3.14 → NUM
result.replace(/\b0x[0-9a-fA-F]+\b/g, 'NUM') // 0xFF → NUM
```

### 2.6 Formatting Removal
- Trim line whitespace
- Remove blank lines
- Remove brace-only lines (`{` or `}`)

---

## 3. Tokenization

Code is split into tokens for structural analysis.

### Token Types
| Type | Description | Example |
|------|-------------|---------|
| `keyword` | Language reserved words | `int`, `if`, `for` |
| `identifier` | Variable/function names | `main`, `count` |
| `operator` | Arithmetic/logical operators | `+`, `==`, `+=` |
| `literal` | Constant values | `10`, `"str"` |
| `separator` | Punctuation | `(`, `)`, `;` |
| `type` | Type keywords | `int`, `float` |

### Token Normalization
```javascript
identifier → 'VAR'     // count → VAR
numeric   → 'NUM'     // 42 → NUM
type      → 'TYPE'    // int, float unchanged
```

### Type Keywords (for normalization detection)
```javascript
const TYPE_KEYWORDS = new Set([
  'int', 'float', 'double', 'char', 'void', 'bool',
  'long', 'short', 'unsigned', 'signed', 'string', 'String',
  'List', 'Array', 'Map', 'Set', 'Vector', 'ArrayList'
])
```

### Operator Normalization
```javascript
const OPERATOR_NORMALIZATION = {
  '+=': 'OP_ASSIGNSUM',   // += → OP_ASSIGNSUM
  '-=': 'OP_ASSIGNSUB',   // -= → OP_ASSIGNSUB
  '++': 'OP_INC',        // ++ → OP_INC
  '==': 'OP_EQ',         // == → OP_EQ
  '&&': 'OP_AND',        // && → OP_AND
}
```

---

## 4. N-Gram Pattern Matching

Multiple n-gram sizes (2,3,4) with weighted scoring detect copied patterns.

### Algorithm
```javascript
// Generate n-grams from token sequences
const ngrams = [2, 3, 4]      // n-gram sizes
const weights = [0.3, 0.4, 0.3]  // weights: tri-gram most important

for (n of ngrams) {
  // Extract all n-grams from sequence A
  for (i = 0; i <= seqA.length - n; i++) {
    gram = seqA.slice(i, i + n).join('|')
    gramsA.set(gram, positions[])
  }
  
  // Same for sequence B
  // Count matching n-grams
}
```

### Weighted Similarity
```javascript
final_similarity = 0.3 * bi_gram_score 
                + 0.4 * tri_gram_score 
                + 0.3 * four_gram_score
```

**Why weighted?** Trigrams (3) are most effective for code. Bigrams catch short patterns, 4-grams catch longer functions.

---

## 5. Longest Common Subsequence (LCS) Line Matching

Instead of exact line matching, LCS finds similar lines even with small edits.

### Dynamic Programming Algorithm
```javascript
// Build LCS table
for (i = 1; i <= m; i++) {
  for (j = 1; j <= n; j++) {
    if (lineA[i-1] === lineB[j-1]) {
      lcs[i][j] = lcs[i-1][j-1] + 1
    } else {
      lcs[i][j] = max(lcs[i-1][j], lcs[i][j-1])
    }
  }
}

// Backtrack to find matches
while (i > 0 && j > 0) {
  if (lineA[i-1] === lineB[j-1]) {
    matches.push({lineA: i, lineB: j})
    i--; j--
  } else if (lcs[i-1][j] > lcs[i][j-1]) {
    i--
  } else {
    j--
  }
}
```

**Example:**
```
Line A: printf("%d", a);
Line B: printf("%d", x);
→ Match detected despite variable rename
```

---

## 6. AST (Abstract Syntax Tree) Comparison

AST captures code structure regardless of variable names.

### Simple AST Parser
```javascript
function parseSimpleAST(code) {
  root = { type: 'Program', children: [] }
  stack = [root]
  
  for (token of tokens) {
    if (token === '{') {
      // New block
      block = { type: 'BlockStatement', children: [] }
      current.children.push(block)
      stack.push(current)
      current = block
    } else if (token === '}') {
      current = stack.pop()
    } else if (token.type === 'keyword') {
      current.children.push({ type: token.value })
    }
  }
  return root
}
```

### Normalized Hash
```javascript
// Normalize identifiers for comparison
node.normalizedHash = node.type + '|VAR'    // Variables → VAR
node.normalizedHash += child.hashes.sort()  // Sort children for rearrangement resistance
```

### Plagiarism Classification
| Score | Type | Description |
|-------|------|------------|
| >85% | **Verbatim** | Exact or near-exact copy |
| >70% | **Renamed** | Variables renamed, same structure |
| >55% | **Rearranged** | Logic reordered |
| >40% | **Structural** | Similar algorithm |

---

## 7. Control Flow Extraction

Extracts control flow structure intoCFG.

### Node Types
```
IF → ELSE → FOR → WHILE → SWITCH → CASE → FUNCTION → RETURN → CALL
```

### Extraction Algorithm
```javascript
function extractControlFlow(code) {
  root = { type: 'FUNCTION', children: [] }
  stack = [root]
  depth = 0
  
  for (token of tokens) {
    if (keyword === 'if') {
      node = { type: 'IF', depth: depth + 1 }
      addNodeToTree(node)
      stack.push(node); depth++
    }
    // Similarly for for, while, switch, etc.
  }
  
  return flatten(root)  // → ['FUNCTION', 'IF', 'FOR', 'ASSIGN']
}
```

---

## 8. Winnowing Fingerprinting

Based on MOSS (Stanford). Detects exact copied fragments.

### Algorithm
```javascript
function generateFingerprints(tokens, windowSize = 5) {
  for (i = 0; i <= tokens.length - windowSize; i++) {
    window = tokens.slice(i, i + windowSize)
    hash = rollingHash(window)
    
    // Winnowing: keep only at intervals
    if (i % windowSize === 0) {
      fingerprints.push({ hash, windowStart: i })
    }
  }
  return fingerprints
}

function rollingHash(window) {
  hash = 0
  for (char of window) {
    hash = (hash * prime + charCode) % MAX_SAFE_INTEGER
  }
  return hash
}
```

### Prefilter
```javascript
// If >20% fingerprints match, warrant detailed comparison
common = countMatchingFingerprints(fpA, fpB)
if (common / total > 0.2) detailedComparison()
```

---

## 9. Data Flow Analysis

Tracks variable definitions and uses to detect renamed-variable plagiarism.

### Example: Original
```c
a = input()
b = a + 2
print(b)
```

### Example: Copied (renamed)
```c
x = input()
y = x + 2
print(y)
```

### Dependency Graph
```
input → a → b → print
input → x → y → print
→ Same structure detected!
```

### Algorithm
```javascript
function analyzeDataFlow(code) {
  variables = new Map()  // name → [{line, type}]
  edges = []             // data flow connections
  
  for (line of code) {
    if (varMatch = line.match(/(\w+)\s*=\s*(\w+)/)) {
      // Definition
      addVariable(varMatch[1], 'definition')
      // Create edge from used variable
      edges.push({ from: varMatch[2], to: varMatch[1] })
    }
  }
  
  return { variables, edges }
}
```

---

## 10. Combined Similarity Scoring

Weighted combination of all analysis methods:

```javascript
combinedSimilarity = 
  AST_similarity          * 0.35 +
  Token_similarity       * 0.25 +
  ControlFlow_similarity * 0.20 +
  DataFlow_similarity    * 0.10 +
  Line_similarity       * 0.10
```

**Weight Justification:**
- **AST (35%):** Most important - captures structure
- **Token (25%):** Pattern matching
- **Control Flow (20%):** Logic structure
- **Data Flow (10%):** Variable dependencies
- **Line (10%):** Basic similarity

---

## 11. Boilerplate Filtering

Removes common code patterns that shouldn't count as plagiarism.

### Patterns Filtered
```javascript
// C/C++
#include <stdio.h>
#define MAX_SIZE

// Java
package com.example;
import java.util.*;

// Python
import os
import sys
if __name__ == '__main__':

// Universal
// comments
// Author: ...
// points: 10
// Assignment 1
```

---

## 12. Multi-File Clustering

Groups similar submissions for easier review.

### Algorithm
```javascript
function clusterSimilarSubmissions(matrix, threshold = 50) {
  clusters = []
  visited = new Set()
  
  for (i = 0; i < n; i++) {
    if (visited.has(i)) continue
    
    cluster = [i]
    for (j = i + 1; j < n; j++) {
      if (matrix[i][j] >= threshold) {
        cluster.push(j)
        visited.add(j)
      }
    }
    
    if (cluster.length > 1) {
      clusters.push(cluster)
    }
  }
  
  return clusters  // [[A,B,C], [D,E], [F]]
}
```

---

## 13. Obfuscation Detection

Detects when students try to hide plagiarism.

### Types Detected
1. **Loop Equivalence:** `for` ↔ `while` conversion
2. **Condition Inversion:** `if`/`else` swap
3. **Function Extraction:** Block moved to function

### Algorithms
```javascript
// Loop equivalence detection
detectLoopEquivalence(codeA, codeB) {
  hasForA = codeA.includes('for')
  hasWhileB = codeB.includes('while')
  return (hasForA && hasWhileB) || (hasWhileA && hasForB)
}

// Condition inversion detection  
detectConditionInversion(codeA, codeB) {
  swapA = codeA.match(/if\s*\([^)]+\)[\s\S]*else/)
  swapB = codeB.match(/if\s*\([^)]+\)[\s\S]*else/)
  return swapA && swapB && swapA[0] !== swapB[0]
}
```

---

## 14. Processing Pipeline

The full analysis pipeline:

```
1. Input Validation
   ↓
2. Preprocessing & Boilerplate Removal
   ↓
3. Tokenization
   ↓
4. Control Flow Extraction
   ↓
5. AST Generation
   ↓
6. Structural Hashing
   ↓
7. N-gram + Fingerprint Comparison
   ↓
8. Similarity Scoring (weighted)
   ↓
9. Matrix Generation + Clustering
   ↓
10. Results + Visualization
```

---

## 15. API Reference

### Core Functions

```typescript
// Preprocessing
preprocessCode(code: string): string

// Tokenization
tokenizeCode(code: string, language: string): Token[]

// Comparison
analyzeCode(codeA: string, codeB: string, language: string): ComparisonResult

// Enhanced with all modules
analyzeCodeEnhanced(codeA: string, codeB: string, language: string): EnhancedComparisonResult

// Multi-file
analyzeMultipleEnhanced(codes: string[], names: string[], language: string): MultiComparisonResult

// N-gram matching
compareTokensWeighted(tokensA: Token[], tokensB: Token[]): { similarity, matchedPairs }

// LCS line matching
findMatchedLinesLCS(codeA: string, codeB: string): { lineA, lineB, content }[]

// AST comparison
compareAST(codeA: string, codeB: string, language: string): ASTComparisonResult

// Control flow
extractControlFlow(code: string): ControlFlowStructure

// Data flow
analyzeDataFlow(code: string, language: string): DataFlowAnalysisResult

// Winnowing fingerprints
generateWinnowingFingerprints(tokens: Token[]): WinnowingFingerprint[]

// Filtering
filterWhitelistedCode(code: string, language?: string): string

// Clustering
clusterSimilarSubmissions(names: string[], matrix: number[][]): PlagiarismCluster[]

// Obfuscation detection
detectObfuscation(codeA: string, codeB: string): ObfuscationResult
```

---

## 16. Quick Reference Card

| Module | Purpose | Key Function |
|--------|---------|------------|
| Preprocessing | Normalize code | `preprocessCode()` |
| Tokenization | Split to tokens | `tokenizeCode()` |
| N-Gram | Pattern matching | `compareTokensWeighted()` |
| LCS | Line similarity | `findMatchedLinesLCS()` |
| AST | Structure analysis | `compareAST()` |
| Control Flow | Logic extraction | `extractControlFlow()` |
| Data Flow | Variable tracking | `analyzeDataFlow()` |
| Winnowing | Fragment detection | `generateWinnowingFingerprints()` |
| Boilerplate | Remove common code | `filterWhitelistedCode()` |
| Clustering | Group similar | `clusterSimilarSubmissions()` |
| Obfuscation | Detect evasion | `detectObfuscation()` |
| Combined | Final score | `analyzeCodeEnhanced()` |

---

*Generated for PARASITE Plagiarism Detection System*