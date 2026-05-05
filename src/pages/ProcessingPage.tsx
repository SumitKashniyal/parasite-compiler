import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { analyzeMultipleEnhanced, filterWhitelistedCode } from "@/lib/plagiarism";
import { validateInput, loadSimilarityThresholds, prepareVisualizationData } from "@/lib/parasite-extensions";

const STEPS = [
  { label: "Input Validation", desc: "Checking file extensions, size, and encoding" },
  { label: "Preprocessing & Boilerplate", desc: "Removing comments, headers, and whitelisted code" },
  { label: "Tokenization", desc: "Splitting code into tokens" },
  { label: "Control Flow Analysis", desc: "Extracting if/for/while/switch structures" },
  { label: "Structural Hashing", desc: "Generating normalized structure hashes" },
  { label: "Token & AST Comparison", desc: "Comparing token sequences and AST structures" },
  { label: "Matrix Generation", desc: "Building similarity matrix with classifications" },
];

const ProcessingPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const codesRaw = sessionStorage.getItem("parasite_codes");
    const namesRaw = sessionStorage.getItem("parasite_names");
    const lang = sessionStorage.getItem("parasite_lang") || "c";

    if (!codesRaw || !namesRaw) {
      navigate("/upload");
      return;
    }

    const codes: string[] = JSON.parse(codesRaw);
    const names: string[] = JSON.parse(namesRaw);

    // Step 1: Input Validation
    setCurrentStep(1);
    const validation = validateInput(names.map((name, i) => ({ name, content: codes[i] })));
    if (!validation.valid) {
      alert(`Validation errors: ${validation.errors.map(e => e.message).join(', ')}`);
      navigate("/upload");
      return;
    }

    // Show each step sequentially
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 2; i <= STEPS.length; i++) {
      timers.push(setTimeout(() => setCurrentStep(i), i * 600));
    }

    // Run analysis after showing steps
    timers.push(setTimeout(() => {
      // Apply boilerplate filtering to both files (shows in console)
      const filteredCodes = codes.map((code, i) => {
        const filtered = filterWhitelistedCode(code);
        console.log(`File ${names[i]}: ${code.split('\n').length} lines → ${filtered.split('\n').length} lines after boilerplate filtering`);
        return filtered;
      });
      
      // Analysis pipeline:
      // 1. Input Validation (done above)
      // 2. Boilerplate filtering (done above)
      // 3. Tokenization (built into analyzeMultipleEnhanced)
      // 4. Control flow extraction (available in parasite-extensions)
      // 5. Structure hashing (available in parasite-extensions)
      // 6. Comparison (built into analyzeMultipleEnhanced)
      // 7. Build similarity matrix (built into analyzeMultipleEnhanced)
      
      const result = analyzeMultipleEnhanced(filteredCodes, names, lang);
      
      // Apply new modules to get enhanced data
      const thresholds = loadSimilarityThresholds();
      console.log('Analysis complete with thresholds:', thresholds);
      console.log('Similarity matrix built for', names.length, 'files with', (names.length * (names.length - 1)) / 2, 'comparisons');
      
      // Get visualization data with new format
      const vizData = prepareVisualizationData(result);
      console.log('Visualization data prepared - Heatmap summary:', vizData.heatmap.summary);
      
      sessionStorage.setItem("parasite_multi_result", JSON.stringify(result));
      sessionStorage.setItem("parasite_viz_data", JSON.stringify(vizData));
      
      setCurrentStep(STEPS.length);
      setTimeout(() => navigate("/results"), 500);
    }, STEPS.length * 600 + 300));

    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <h1 className="text-3xl font-bold text-gradient-primary mb-8 text-center">Analyzing Code</h1>

        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = currentStep > i;
            const active = currentStep === i;
            return (
              <div
                key={step.label}
                className={`p-4 rounded-xl border transition-all duration-500 ${
                  done ? "bg-primary/10 border-primary/30" : active ? "bg-card border-primary/50 animate-pulse-glow" : "bg-card/50 border-border/50 opacity-40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : active ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-muted-foreground/30" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingPage;
