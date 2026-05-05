# PARASITE Project: Deep Technical Guide & Team Workflow

This guide provides a deep dive into the **PARASITE** system's internal logic, organized for a 4-person team (2 Frontend + 2 Backend).

---

## 🧐 What does PARASITE actually do?
PARASITE is a **Structural Plagiarism Detector**. It doesn't just look at words; it looks at the "skeleton" of the code.

### 💡 Example: Detecting Plagiarism
Imagine two students submit code for a Fibonacci series:

| **Student A (`fibonacci.py`)** | **Student B (`fibonacciFunc.py`)** |
|:--- |:--- |
| ```python
limit = int(input())
a, b = 0, 1
for _ in range(limit):
    print(a)
    a, b = b, a + b
``` | ```python
def fib(n):
    x, y = 0, 1
    for i in range(n):
        print(x)
        x, y = y, x + y
fib(int(input()))
``` |

**How PARASITE catches them:**
1.  **Normalization**: It ignores that Student B used a function (`def fib`) and different variables (`x, y` vs `a, b`).
2.  **Tokenization**: Both codes generate a similar sequence: `VAR = int(input())`, `VAR, VAR = NUM, NUM`, `FOR VAR IN RANGE(VAR)`.
3.  **AST Matching**: It sees that both have a "Loop" containing an "Assignment" and a "Print" statement in the exact same order.
4.  **Result**: PARASITE flags this as **>90% Similarity (Structural Plagiarism)**.

---

## ⚙️ Backend Department (The Brains)

### 👤 Person 3: The Core Engine Engineer (Tokens & Patterns)
**Goal:** Convert raw messy code into clean, analyzable "DNA" (Tokens).

*   **Key Functions & Logic:**
    *   `preprocessCode(code)`:
        *   *Logic*: Uses Regex (`replace(/\/\/.*$/gm, '')`) to strip comments and normalize whitespace. This ensures that adding extra spaces or comments doesn't hide plagiarism.
    *   `tokenizeCode(code, language)`:
        *   *Logic*: Loops through the code and categorizes every word. `int`, `for`, `while` become `KEYWORD`; `x`, `total` become `VAR`.
        *   *Why*: By turning all variables into `VAR`, we defeat "Variable Renaming" plagiarism.
    *   `compareTokensWeighted(tokensA, tokensB)`:
        *   *Logic*: Uses **N-Grams**. It looks for groups of 3 tokens (Trigrams). If Student A has `[VAR, ASSIGN, NUM]` and Student B has the same, it's a match.
    *   `findMatchedLinesLCS(codeA, codeB)`:
        *   *Logic*: The **Longest Common Subsequence** algorithm. It finds the longest string of lines that appear in both files in the same order, even if there are different lines in between.

### 👤 Person 4: The Advanced Logic Architect (Structure & Systems)
**Goal:** Analyze the "Logic Flow" and manage the high-speed processing.

*   **Key Functions & Logic:**
    *   `compareAST(codeA, codeB)`:
        *   *Logic*: Builds a "Tree" of the code. A `for` loop is a parent node, and the code inside it are children. It compares the *shape* of these trees.
        *   *Why*: This catches "Logic Reordering" (e.g., moving a block of code into a function).
    *   `extractControlFlow(code)`:
        *   *Logic*: Creates a list of "Decision Points" (IF, ELSE, FOR, WHILE).
        *   *Example*: `IF -> FOR -> PRINT` is a unique logic signature.
    *   `analyzeMultipleEnhanced(codes, names)`:
        *   *Logic*: The "Master Orchestrator." It takes an array of 10+ files and runs Person 3's and Person 4's algorithms on every possible pair (File 1 vs 2, 1 vs 3, etc.).
    *   `plagiarism.worker.ts`:
        *   *Logic*: This is a **Web Worker**. It runs the heavy math on a separate CPU thread so the website doesn't "freeze" while analyzing 50 files.

---

## 🎨 Frontend Department (The Face)

### 👤 Person 1: UI/UX & Design Master
*   **Focus**: Branding, Hero sections, and smooth animations.
*   **Key Task**: Make the `ProcessingPage` look exciting with progress bars and pulsing glows while the backend is working.

### 👤 Person 2: Data Viz & Reporting
*   **Focus**: Turning the `MultiComparisonResult` (from Person 4) into a Heatmap and PDF.
*   **Key Task**: Build the `VisualizationPage` where users can click on an AST node and see which line of code it represents.

---

## 🔄 The Full Pipeline
1.  **Upload**: Person 2 collects the files.
2.  **Clean**: Person 3 removes comments and spaces.
3.  **Tokenize**: Person 3 converts code to "DNA" tokens.
4.  **Structure**: Person 4 builds the AST and Control Flow maps.
5.  **Score**: The system calculates a weighted average: (AST 40% + Tokens 30% + LCS 30%).
6.  **Display**: Person 1 & 2 show the results in a beautiful dashboard.

---
*Generated for the PARASITE Development Team - Technical Edition*
