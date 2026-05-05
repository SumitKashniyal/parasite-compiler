# 🧬 PARASITE

### Compiler-Based Structural Plagiarism Detection System

---

## 🔍 Overview

**PARASITE** is a compiler-inspired static analysis system designed to detect **structural plagiarism in source code**.
Unlike traditional text-based approaches, PARASITE analyzes the **internal structure and logic flow** of programs using techniques derived from compiler design.

It identifies similarities even when:

* Variables are renamed
* Code is reformatted
* Logic is slightly rearranged

---

## ⚙️ Key Features

* 🔹 Token-based similarity using **N-grams**
* 🔹 **AST (Abstract Syntax Tree)** comparison
* 🔹 **Control Flow Analysis** (IF, LOOP, FUNCTION patterns)
* 🔹 **Data Flow Analysis** (variable usage tracking)
* 🔹 **LCS (Longest Common Subsequence)** for line matching
* 🔹 Multi-file comparison with **similarity matrix**
* 🔹 Interactive **visualization dashboard**
* 🔹 Web Worker-based parallel processing

---

## 🧠 Compiler Concepts Used

PARASITE is built on core compiler design principles:

* **Lexical Analysis**
  Source code is tokenized into normalized tokens (VAR, NUM, KEYWORD)

* **Syntax Analysis**
  Code is transformed into AST-like structures for structural comparison

* **Symbol Table Generation**
  Variables and identifiers are normalized to remove naming differences

* **Intermediate Representations (IR)**
  Multiple IR forms are used:

  * Token Streams
  * AST Structures
  * Control Flow Graph (CFG)
  * Data Flow Graph

* **Static Analysis**
  Structural similarity is computed using:

  * N-grams
  * LCS
  * Structural hashing

---

## 🔄 System Pipeline

1. **Input Validation**
2. **Preprocessing & Normalization**
3. **Tokenization (Lexical Analysis)**
4. **Symbol Table Generation**
5. **AST & Structural Analysis**
6. **Control Flow Extraction**
7. **Data Flow Analysis**
8. **Fingerprint Generation**
9. **Similarity Computation**
10. **Visualization & Reporting**

---

## 📊 Similarity Calculation

The final plagiarism score is computed using a weighted model:

```
Combined Score = (AST × 40%) + (Token × 30%) + (LCS × 30%)
```

---

## 🖥️ Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS
* **Backend Logic:** TypeScript (Compiler-style processing)
* **Worker Threads:** Web Workers
* **Build Tool:** Vite

---

## 🚀 How to Run Locally

```bash
# Clone the repository
git clone https://github.com/your-username/parasite-compiler.git

# Navigate to project folder
cd parasite-compiler

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📸 Screenshots

<img width="1890" height="856" alt="Screenshot 2026-05-06 005235" src="https://github.com/user-attachments/assets/18122063-be8c-445d-a8e8-6d9f743607e6" />

<img width="1871" height="848" alt="Screenshot 2026-05-06 005253" src="https://github.com/user-attachments/assets/9145becf-4b59-4d2c-ba90-a2bca5534ea4" />

<img width="1773" height="888" alt="Screenshot 2026-05-06 005324" src="https://github.com/user-attachments/assets/6f161131-793d-42e5-8c9f-cc746dcf2fa1" />

<img width="1816" height="869" alt="Screenshot 2026-05-06 005338" src="https://github.com/user-attachments/assets/83406c85-2c48-4262-88dd-2f5d2f950368" />

<img width="1755" height="900" alt="Screenshot 2026-05-06 005359" src="https://github.com/user-attachments/assets/ac41f344-3e7c-4f56-a969-5955d49e7ad2" />


* Home Page
* Upload Interface
* Processing Pipeline
* Results Page
* Visualization Dashboard

---

## 📁 Project Structure

```
src/
 ├── components/        # UI Components
 ├── pages/             # Application Pages
 ├── lib/               # Core analysis logic
 ├── workers/           # Web worker for processing
 ├── hooks/             # Custom hooks
```

---

## 👥 Team

* **Frontend Developers** – UI/UX & Visualization
* **Backend Developers** – Compiler Logic & Analysis Engine

---

## 🎯 Future Enhancements

* Multi-language parsing (C++, Java, Python)
* Real AST parser integration
* Machine learning-based similarity scoring
* Cloud-based large-scale analysis

---

## 📌 Conclusion

PARASITE demonstrates how **compiler design principles** can be applied beyond compilation to solve real-world problems like plagiarism detection through **structural code analysis**.

---

## ⭐ Acknowledgement

Developed as a **Compiler Design Project** showcasing practical application of lexical, syntactic, and semantic analysis.

---
