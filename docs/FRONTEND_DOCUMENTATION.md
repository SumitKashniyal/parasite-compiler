# PARASITE Frontend Documentation

Complete guide to the React frontend for developers and presentations.

---

## 1. Architecture Overview

### Tech Stack
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **React Router** | Navigation |
| **React Query** | State management |
| **Recharts** | Data visualization |
| **jsPDF** | PDF generation |

### Project Structure
```
src/
├── components/       # Reusable UI components
│   ├── Navbar.tsx   # Top navigation
│   └── NavLink.tsx  # Navigation link
├── pages/          # Page components
│   ├── LandingPage.tsx
│   ├── UploadPage.tsx
│   ├── ProcessingPage.tsx
│   ├── ResultsPage.tsx
│   ├── VisualizationPage.tsx
│   └── NotFound.tsx
├── lib/            # Business logic
│   ├── plagiarism.ts       # Core detection
│   ├── parasite-extensions.ts # Extended modules
│   ├── pdfReport.ts   # PDF export
│   └── utils.ts      # Helpers
├── hooks/          # Custom hooks
│   └── usePlagiarismWorker.ts
├── workers/        # Web workers
│   └── plagiarism.worker.ts
├── App.tsx         # Router setup
├── main.tsx        # Entry point
└── index.css       # Global styles
```

---

## 2. Routing

### Routes ([`src/App.tsx`](src/App.tsx:1))

```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/upload" element={<UploadPage />} />
  <Route path="/processing" element={<ProcessingPage />} />
  <Route path="/results" element={<ResultsPage />} />
  <Route path="/visualization" element={<VisualizationPage />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Navigation Flow
```
LandingPage
    ↓ (Start Checking button)
UploadPage
    ↓ (Compare Code button)
ProcessingPage
    ↓ (auto-redirect after ~4s)
ResultsPage
    ↓ (View Detailed Visualization button)
VisualizationPage
```

---

## 3. Page Details

### 3.1 LandingPage (`src/pages/LandingPage.tsx`)

**Purpose:** Marketing/landing page

**Components:**
- Hero section with gradient "PARASITE" title
- 4 feature cards:
  - Multi-File Comparison
  - Token Analysis
  - N-Gram Matching
  - Multi-Language
- "How It Works" section with 4 steps
- Call-to-action buttons

**Key Elements:**
- Animated glow effects
- Grid background pattern
- Gradient text
- Hover animations on cards

**State:** None (static page)

---

### 3.2 UploadPage (`src/pages/UploadPage.tsx`)

**Purpose:** Code file input

**State:**
```typescript
interface CodeEntry {
  id: string
  name: string      // filename
  code: string     // code content
}
```

**Supported Languages:**
```typescript
const LANGUAGES = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
]
```

**Features:**
- Language dropdown selector
- Dynamic file entries (add/remove)
- File upload button (reads via FileReader)
- Text area for each file
- "Compare Code" button (disabled until 2+ files have content)

**Data Flow:**
- User clicks "Compare Code" → codes stored in sessionStorage
- Navigates to `/processing`

**sessionStorage Keys:**
- `parasite_codes` - JSON array of code strings
- `parasite_names` - JSON array of filenames
- `parasite_lang` - selected language string

---

### 3.3 ProcessingPage (`src/pages/ProcessingPage.tsx`)

**Purpose:** Show analysis progress

**Processing Steps:**
```
1. Input Validation
2. Preprocessing & Boilerplate
3. Tokenization
4. Control Flow Analysis
5. Structural Hashing
6. Token & AST Comparison
7. Matrix Generation
```

**Algorithm:** (runs in `useEffect`)

```typescript
useEffect(() => {
  // 1. Read from sessionStorage
  const codes = JSON.parse(sessionStorage.getItem('parasite_codes'))
  const names = JSON.parse(sessionStorage.getItem('parasite_names'))
  const lang = sessionStorage.getItem('parasite_lang')

  // 2. Run analysis
  const result = analyzeMultipleEnhanced(codes, names, lang)

  // 3. Store result
  sessionStorage.setItem('parasite_multi_result', JSON.stringify(result))

  // 4. Navigate to results
  navigate('/results')
}, [])
```

**UI Features:**
- Animated step completion (checkmark checkmarks)
- Active step pulse animation
- Progress bar (fills from 0-100%)

**Timing:** ~4 seconds total (600ms per step × 7 = 4.2s)

---

### 3.4 ResultsPage (`src/pages/ResultsPage.tsx`)

**Purpose:** Display comparison results

**State:**
```typescript
interface MultiComparisonResult {
  fileNames: string[]
  codes: string[]
  language: string
  pairResults: {
    i: number
    j: number
    result: ComparisonResult
  }[]
  matrix: number[][]  // similarity matrix
}
```

**Components:**

1. **Similarity Matrix** (3+ files only)
   - Table with file names as headers
   - Cell colors: green (<30%), yellow (30-65%), red (>65%)
   - Clickable to select pair

2. **Pair Selector** (buttons)
   ```
   [File1 vs File2 — 85%] [File1 vs File3 — 42%]
   ```

3. **Score Card**
   - Similarity percentage (large, gradient)
   - Classification badge (Low/Medium/High)
   - Matched lines count

4. **Similarity Bar**
   - Horizontal progress bar
   - Color gradient based on score
   - Shimmer animation

5. **Side-by-Side Code**
   - Two panels with line numbers
   - Highlighted matched lines (`.highlight-match`)
   - Scrollable (max 400px height)

6. **Export PDF Button**
   - Uses jsPDF to generate report
   - Downloads as `parasite-report-{file1}-vs-{file2}.pdf`

**Navigation:**
- Back → `/upload`
- Forward → `/visualization`

---

### 3.5 VisualizationPage (`src/pages/VisualizationPage.tsx`)

**Purpose:** Detailed data visualization

**Tabs:**
```typescript
type Tab = "tokens" | "ast" | "heatmap"
```

#### Tab 1: Token Table
Shows tokens side-by-side with:
- Token index (#)
- File A token value
- Token type
- Normalized value
- File B token value
- Match status

**Display:** First 100 tokens (scrollable)

#### Tab 2: AST Tree
Shows Abstract Syntax Tree breakdown:
- Program Root (root node)
- Token type counts by category:
  - keyword, identifier, operator, etc.

**Visual:**
```
Program Root
    ↓
[keyword: 12]  [identifier: 8]  [operator: 15]
```

#### Tab 3: Heatmap

**Multi-file mode:**
- Grid with file names on axes
- Color-coded cells (heatmap)
- Stats: highest, lowest, average similarity

**Single-pair mode:**
- Line-by-line matrix
- Yellow = matched, gray = not matched

---

### 3.6 NotFound Page (`src/pages/NotFound.tsx`)

**Purpose:** 404 error page

**Features:**
- Error icon
- "Page not found" message
- "Go Home" button

---

## 4. Components

### 4.1 Navbar (`src/components/Navbar.tsx`)

**Purpose:** Top navigation bar

**Content:**
- Logo/title "PARASITE"
- Navigation links: Home, Upload, Results

**Styling:**
- Fixed position
- Glassmorphism effect (backdrop blur)
- Border bottom

---

### 4.2 NavLink (`src/components/NavLink.tsx`)

**Purpose:** Styled navigation link

**Features:**
- Active state highlighting
- Hover effects

---

## 5. Styling System

### 5.1 Color Scheme (`src/index.css`)

```css
:root {
  /* Core */
  --background: 220 20% 4%    /* Dark blue-black */
  --foreground: 180 10% 90%     /* Light cyan */

  /* Brand */
  --primary: 168 80% 50%       /* Teal/Cyan */
  --accent: 142 70% 50%        /* Green */

  /* Semantic */
  --destructive: 0 70% 55%     /* Red */
  --warning: 38 90% 55%         /* Yellow */
  --success: 142 70% 50%        /* Green */
}
```

### 5.2 Custom Utilities

| Class | Purpose |
|-------|---------|
| `.glow-primary` | Cyan box shadow glow |
| `.glow-accent` | Green box shadow glow |
| `.text-gradient-primary` | Gradient text |
| `.bg-grid` | Grid pattern background |
| `.highlight-match` | Matched line highlight |
| `.animate-pulse-glow` | Pulse animation |
| `.animate-shimmer` | Shimmer effect |
| `.card-hover` | Card hover animation |

### 5.3 Fonts

| Font | Usage |
|------|-------|
| **Sora** | Headings |
| **Inter** | Body text |
| **JetBrains Mono** | Code |

---

## 6. Data Storage

### SessionStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `parasite_codes` | `string[]` | Code content |
| `parasite_names` | `string[]` | Filenames |
| `parasite_lang` | `string` | Selected language |
| `parasite_multi_result` | `MultiComparisonResult` | Analysis results |
| `parasite_viz_data` | `VisualizationData` | Visualization data |

---

## 7. Business Logic Libraries

### 7.1 plagiarism.ts (`src/lib/plagiarism.ts`)

Core detection functions.

**Key Exports:**
```typescript
// Preprocessing
preprocessCode(code: string): string

// Tokenization  
tokenizeCode(code: string, language: string): Token[]

// Comparison
analyzeCode(codeA: string, codeB: string, language: string): ComparisonResult
analyzeCodeEnhanced(codeA: string, codeB: string, language: string): EnhancedComparisonResult
analyzeMultipleEnhanced(codes: string[], names: string[], language: string): MultiComparisonResult

// N-gram matching
compareTokensWeighted(tokensA: Token[], tokensB: Token[]): { similarity, matchedPairs }

// Line matching
findMatchedLinesLCS(codeA: string, codeB: string): { lineA, lineB, content }[]

// AST
compareAST(codeA: string, codeB: string, language: string): ASTComparisonResult

// Filtering
filterWhitelistedCode(code: string, language?: string): string

// Clustering
clusterSimilarSubmissions(names: string[], matrix: number[][]): PlagiarismCluster[]

// Obfuscation
detectObfuscation(codeA: string, codeB: string): ObfuscationResult

// PDF generation data
generateReportData(result: EnhancedComparisonResult, fileNameA: string, fileNameB: string): ReportSection[]

// Network graph
generateNetworkGraph(result: MultiComparisonResult): { nodes, edges }
```

### 7.2 parasite-extensions.ts (`src/lib/parasite-extensions.ts`)

Extended analysis modules.

**Key Exports:**
```typescript
// Input validation
validateInput(files: { name, content }[]): ValidationResult

// Symbol table
generateSymbolTable(tokens: Token[]): SymbolTable

// Control flow
extractControlFlow(code: string): ControlFlowStructure

// Structure hash
generateStructureHash(structure: ControlFlowStructure): StructureHash

// Matrix builder
buildSimilarityMatrix(files: { name, content }[], language, compareFunction): SimilarityMatrixResult

// Thresholds
loadSimilarityThresholds(): SimilarityThresholds
getClassification(similarity: number): 'Low' | 'Medium' | 'High'

// Fingerprints
generateFingerprints(tokens: Token[]): FingerprintIndex

// Visualization data
prepareVisualizationData(result: MultiComparisonResult): VisualizationData

// Data flow
analyzeDataFlow(code: string, language: string): DataFlowAnalysisResult
compareDataFlow(codeA: string, codeB: string, language: string): number
```

### 7.3 pdfReport.ts (`src/lib/pdfReport.ts`)

PDF generation.

**Key Exports:**
```typescript
generatePDFReport(
  result: EnhancedComparisonResult,
  fileNameA: string,
  fileNameB: string,
  options?: PDFReportOptions
): Promise<Blob>

downloadPDFReport(blob: Blob, filename: string): void
```

---

## 8. User Interactions

### 8.1 Main Workflow

```
1. Landing Page
   └─ Click "Start Checking" → UploadPage

2. Upload Page
   ├─ Select language (dropdown)
   ├─ Add files (click "Add File")
   ├─ Upload file (click "Upload" button)
   ├─ Paste code (type in textarea)
   └─ Click "Compare Code" → ProcessingPage

3. Processing Page
   └─ Watch progress (auto-redirects to ResultsPage after ~4s)

4. Results Page
   ├─ View matrix (3+ files)
   ├─ Select pair (click buttons)
   ├─ View score card
   ├─ View side-by-side code
   ├─ Export PDF (click button)
   └─ Click "View Detailed Visualization" → VisualizationPage

5. Visualization Page
   ├─ Token Table tab
   ├─ AST Tree tab
   └─ Heatmap tab
```

### 8.2 Error Handling

- Invalid file extension → Alert + redirect to upload
- Empty file → Alert + redirect to upload
- No session data → Redirect to upload

---

## 9. Animations

### 9.1 CSS Animations (`src/index.css`)

```css
/* Pulse glow for active step */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px hsl(var(--primary) / 0.2); }
  50% { box-shadow: 0 0 20px hsl(var(--primary) / 0.4); }
}

/* Shimmer effect */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Match highlight */
@keyframes match-pulse {
  0%, 100% { background-color: hsl(var(--primary) / 0.15); }
  50% { background-color: hsl(var(--primary) / 0.25); }
}
```

### 9.2 React Animations

```typescript
// Fade in with keyframes
className={active ? "animate-pulse-glow" : ""}

// Progress bar
style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
```

---

## 10. Responsive Design

### Breakpoints
| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Default | <640px | Single column |
| sm | ≥640px | 2 columns (some) |
| md | ≥768px | Full layout |
| lg | ≥1024px | Side-by-side features |

### Mobile Considerations
- Grid: `grid-cols-1 lg:grid-cols-2`
- Padding: `p-4 md:p-8`
- Text: `text-xl md:text-2xl`

---

## 11. Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ (for optional chaining)
- Web Workers API for background processing

---

## 12. Performance

### Optimization Techniques
- **Tailwind CSS** - Purge unused styles
- **Vite** - Fast HMR
- **SessionStorage** - No database needed
- **Web Workers** - Background processing
- **Lazy Loading** - Route-based code splitting

### Bundle Size
- Core: ~150KB (gzipped)
- Dependencies: ~300KB
- Total: ~450KB

---

## 13. Quick Reference

### Start Development
```bash
cd parasite-compiler
npm run dev
# Open http://localhost:5173
```

### Add New Language
1. Add to `KEYWORDS` in `plagiarism.ts`
2. Add patterns to `LANGUAGE_PATTERNS`
3. Update language dropdown in `UploadPage.tsx`

### Add New Analysis Module
1. Create function in `parasite-extensions.ts`
2. Export type and function
3. Add to weight calculation in `analyzeCodeEnhanced()`

### Modify Styling
1. Colors: Edit CSS variables in `index.css`
2. Components: Edit Tailwind classes in components
3. Fonts: Update Google Fonts import

---

*Generated for PARASITE Plagiarism Detection System*