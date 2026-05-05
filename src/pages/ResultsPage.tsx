import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Eye, ArrowLeft, Download } from "lucide-react";
import type { MultiComparisonResult, EnhancedComparisonResult } from "@/lib/plagiarism";
import { generatePDFReport, downloadPDFReport } from "@/lib/pdfReport";

const ResultsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MultiComparisonResult | null>(null);
  const [selectedPair, setSelectedPair] = useState<number>(0);

  useEffect(() => {
    const r = sessionStorage.getItem("parasite_multi_result");
    if (!r) { navigate("/upload"); return; }
    setData(JSON.parse(r));
  }, [navigate]);

  if (!data || data.pairResults.length === 0) return null;

  const pair = data.pairResults[selectedPair];
  const result = pair.result;

  const matchedLinesA = new Set(result.matchedLines.map(m => m.lineA));
  const matchedLinesB = new Set(result.matchedLines.map(m => m.lineB));

  const classConfig = {
    Low: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", border: "border-success/30" },
    Medium: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
    High: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  }[result.classification];

  const Icon = classConfig.icon;
  const linesA = data.codes[pair.i].split("\n");
  const linesB = data.codes[pair.j].split("\n");

  const getClassColor = (sim: number) =>
    sim >= 65 ? "text-destructive" : sim >= 30 ? "text-warning" : "text-success";

  return (
    <div className="min-h-screen bg-background bg-grid p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/upload")} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-5 h-5 text-secondary-foreground" />
          </button>
          <h1 className="text-3xl font-bold text-gradient-primary">Results</h1>
        </div>

        {/* Similarity Matrix */}
        {data.fileNames.length > 2 && (
          <div className="mb-8 p-4 rounded-xl bg-card border border-border overflow-auto">
            <p className="font-mono text-sm text-primary mb-3">Similarity Matrix</p>
            <table className="text-sm font-mono w-auto">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-muted-foreground" />
                  {data.fileNames.map((name, i) => (
                    <th key={i} className="px-3 py-2 text-primary truncate max-w-[120px]">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.fileNames.map((name, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-primary truncate max-w-[120px]">{name}</td>
                    {data.matrix[i].map((sim, j) => {
                      const pairIdx = data.pairResults.findIndex(
                        (p) => (p.i === Math.min(i, j) && p.j === Math.max(i, j))
                      );
                      const isClickable = i !== j && pairIdx >= 0;
                      return (
                        <td
                          key={j}
                          onClick={() => isClickable && setSelectedPair(pairIdx)}
                          className={`px-3 py-2 text-center ${
                            i === j ? "text-muted-foreground" : `${getClassColor(sim)} cursor-pointer hover:bg-primary/5`
                          } ${selectedPair === pairIdx && i !== j ? "bg-primary/10 rounded" : ""}`}
                        >
                          {sim}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pair selector for 2-file case or current pair info */}
        {data.pairResults.length > 1 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {data.pairResults.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPair(idx)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                  selectedPair === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {data.fileNames[p.i]} vs {data.fileNames[p.j]} — {p.result.similarity}%
              </button>
            ))}
          </div>
        )}

        {/* Score card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative p-8 rounded-2xl bg-card border border-border overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
            <div className="relative">
              <p className="text-sm text-muted-foreground mb-1 font-mono">Similarity Score</p>
              <p className="text-6xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {result.similarity}%
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {data.fileNames[pair.i]} vs {data.fileNames[pair.j]}
              </p>
            </div>
          </div>
          <div className={`p-6 rounded-xl ${classConfig.bg} border ${classConfig.border} text-center flex flex-col items-center justify-center`}>
            <Icon className={`w-8 h-8 ${classConfig.color} mb-2`} />
            <p className={`text-xl font-bold ${classConfig.color}`}>{result.classification} Similarity</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <p className="text-sm text-muted-foreground mb-1 font-mono">Matched Lines</p>
            <p className="text-5xl font-bold text-accent">{result.matchedLines.length}</p>
          </div>
        </div>

        {/* Similarity bar */}
        <div className="mb-8 p-6 rounded-2xl bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-3 font-mono">Similarity Distribution</p>
          <div className="h-8 bg-secondary rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                result.similarity >= 65 ? "bg-gradient-to-r from-destructive to-red-400" : result.similarity >= 30 ? "bg-gradient-to-r from-warning to-amber-400" : "bg-gradient-to-r from-success to-emerald-400"
              }`}
              style={{ width: `${result.similarity}%` }}
            />
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
              {result.similarity}%
            </span>
          </div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground font-mono">
            <span>0% – Unique</span>
            <span>30% – Low</span>
            <span>65% – Medium</span>
            <span>100% – Identical</span>
          </div>
        </div>

        {/* Side-by-side code */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" /> Side-by-Side Comparison
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[{ lines: linesA, matched: matchedLinesA, label: data.fileNames[pair.i] },
              { lines: linesB, matched: matchedLinesB, label: data.fileNames[pair.j] }].map((item) => (
              <div key={item.label} className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-secondary/50">
                  <span className="font-mono text-sm text-primary">{item.label}</span>
                </div>
                <div className="p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
                  <pre className="font-mono text-sm">
                    {item.lines.map((line, i) => (
                      <div
                        key={i}
                        className={`flex ${item.matched.has(i + 1) ? "highlight-match" : ""}`}
                      >
                        <span className="w-8 text-right pr-3 text-muted-foreground/50 select-none shrink-0">{i + 1}</span>
                        <span className="text-foreground/90">{line || " "}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate("/visualization")}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center gap-2 hover:scale-105 transition-all glow-primary"
          >
            View Detailed Visualization <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              const codes: string[] = data?.codes || [];
              if (codes.length >= 2) {
                // Get enhanced result from pair
                const resultData = pair.result as unknown as EnhancedComparisonResult;
                if (resultData) {
                  try {
                    const blob = await generatePDFReport(
                      resultData,
                      data.fileNames[pair.i],
                      data.fileNames[pair.j]
                    );
                    downloadPDFReport(blob, `parasite-report-${data.fileNames[pair.i]}-vs-${data.fileNames[pair.j]}.pdf`);
                  } catch (e) {
                    console.error('PDF generation failed:', e);
                    alert('Failed to generate PDF. Please try again.');
                  }
                }
              }
            }}
            className="px-6 py-3 bg-card border border-border text-foreground font-semibold rounded-lg flex items-center gap-2 hover:scale-105 transition-all hover:border-primary/30"
          >
            <Download className="w-5 h-5" /> Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
