import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Table2, GitBranch, Grid3X3 } from "lucide-react";
import type { MultiComparisonResult, Token } from "@/lib/plagiarism";
import { prepareVisualizationData, getClassification } from "@/lib/parasite-extensions";

const VisualizationPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MultiComparisonResult | null>(null);
  const [selectedPair, setSelectedPair] = useState(0);
  const [activeTab, setActiveTab] = useState<"tokens" | "ast" | "heatmap">("tokens");

  useEffect(() => {
    const r = sessionStorage.getItem("parasite_multi_result");
    if (!r) { navigate("/upload"); return; }
    setData(JSON.parse(r));
  }, [navigate]);

  if (!data || data.pairResults.length === 0) return null;

  const pair = data.pairResults[selectedPair];
  const result = pair.result;
  const matchedA = new Set(result.matchedTokenPairs.map(p => p.indexA));
  const matchedB = new Set(result.matchedTokenPairs.map(p => p.indexB));

  const tabs = [
    { id: "tokens" as const, label: "Token Table", icon: Table2 },
    { id: "ast" as const, label: "AST Tree", icon: GitBranch },
    { id: "heatmap" as const, label: "Heatmap", icon: Grid3X3 },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/results")} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-5 h-5 text-secondary-foreground" />
          </button>
          <h1 className="text-3xl font-bold text-gradient-primary">Visualization</h1>
        </div>

        {/* Pair selector */}
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
                {data.fileNames[p.i]} vs {data.fileNames[p.j]}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all ${
                activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === "tokens" && <TokenTable tokensA={result.tokensA} tokensB={result.tokensB} matchedA={matchedA} matchedB={matchedB} nameA={data.fileNames[pair.i]} nameB={data.fileNames[pair.j]} />}
        {activeTab === "ast" && <ASTView tokensA={result.tokensA} tokensB={result.tokensB} nameA={data.fileNames[pair.i]} nameB={data.fileNames[pair.j]} />}
        {activeTab === "heatmap" && <HeatmapView result={result} data={data} selectedPair={selectedPair} />}
      </div>
    </div>
  );
};

function TokenTable({ tokensA, tokensB, matchedA, matchedB, nameA, nameB }: { tokensA: Token[]; tokensB: Token[]; matchedA: Set<number>; matchedB: Set<number>; nameA: string; nameB: string }) {
  const maxLen = Math.max(tokensA.length, tokensB.length);
  const rows = Math.min(maxLen, 100);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm font-mono">
          <thead className="bg-secondary/50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left text-primary">{nameA} Token</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Type</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Norm.</th>
              <th className="px-3 py-2 text-left text-primary">{nameB} Token</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Type</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Norm.</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Match</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => {
              const a = tokensA[i];
              const b = tokensB[i];
              const isMatchA = matchedA.has(i);
              const isMatchB = matchedB.has(i);
              return (
                <tr key={i} className={`border-t border-border/50 ${isMatchA || isMatchB ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-1.5 text-muted-foreground/50">{i}</td>
                  <td className="px-3 py-1.5 text-foreground">{a?.value || "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{a?.type || "—"}</td>
                  <td className="px-3 py-1.5 text-accent">{a?.normalized || "—"}</td>
                  <td className="px-3 py-1.5 text-foreground">{b?.value || "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{b?.type || "—"}</td>
                  <td className="px-3 py-1.5 text-accent">{b?.normalized || "—"}</td>
                  <td className="px-3 py-1.5">
                    {isMatchA || isMatchB ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">Match</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {maxLen > 100 && (
        <p className="p-3 text-xs text-muted-foreground text-center border-t border-border">
          Showing first 100 of {maxLen} tokens
        </p>
      )}
    </div>
  );
}

function ASTView({ tokensA, tokensB, nameA, nameB }: { tokensA: Token[]; tokensB: Token[]; nameA: string; nameB: string }) {
  const buildTree = (tokens: Token[]) => {
    const types: Record<string, Token[]> = {};
    tokens.forEach(t => {
      if (!types[t.type]) types[t.type] = [];
      types[t.type].push(t);
    });
    return types;
  };

  const treeA = buildTree(tokensA);
  const treeB = buildTree(tokensB);

  const TreeBlock = ({ tree, label }: { tree: Record<string, Token[]>; label: string }) => (
    <div className="rounded-xl bg-card border border-border p-4">
      <p className="font-mono text-sm text-primary mb-3">{label}</p>
      <div className="space-y-3">
        <div className="text-center font-mono text-sm text-foreground border border-primary/30 rounded-lg p-2 bg-primary/5">
          Program Root
        </div>
        <div className="flex justify-center">
          <div className="w-px h-4 bg-primary/30" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(tree).map(([type, tokens]) => (
            <div key={type} className="border border-border rounded-lg p-2 text-center">
              <p className="text-xs text-accent font-mono mb-1">{type}</p>
              <p className="text-lg font-bold text-foreground">{tokens.length}</p>
              <div className="mt-1 flex flex-wrap gap-1 justify-center max-h-16 overflow-hidden">
                {tokens.slice(0, 5).map((t, i) => (
                  <span key={i} className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">
                    {t.value}
                  </span>
                ))}
                {tokens.length > 5 && <span className="text-[10px] text-muted-foreground">+{tokens.length - 5}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TreeBlock tree={treeA} label={`${nameA} – AST Overview`} />
      <TreeBlock tree={treeB} label={`${nameB} – AST Overview`} />
    </div>
  );
}

function HeatmapView({ result, data, selectedPair }: { 
  result: any; 
  data?: MultiComparisonResult; 
  selectedPair?: number 
}) {
  // Check if we have multi-file comparison data
  const hasMultiFile = data && data.fileNames.length > 2;
  
  if (hasMultiFile && data) {
    // Show matrix view for multi-file comparisons
    const { matrix, fileNames } = data;
    
    // Calculate summary stats
    let totalSim = 0;
    let count = 0;
    let maxSim = { files: ['', ''], value: 0 };
    let minSim = { files: ['', ''], value: 100 };
    
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix[i].length; j++) {
        const sim = matrix[i][j];
        if (sim > maxSim.value) maxSim = { files: [fileNames[i], fileNames[j]], value: sim };
        if (sim < minSim.value) minSim = { files: [fileNames[i], fileNames[j]], value: sim };
        totalSim += sim;
        count++;
      }
    }
    const avgSim = count > 0 ? Math.round(totalSim / count) : 0;

    return (
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="font-mono text-sm text-primary mb-4">Similarity Matrix Heatmap</p>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Highest</p>
            <p className="text-lg font-bold text-destructive">{maxSim.value}%</p>
            <p className="text-xs text-muted-foreground truncate">{maxSim.files[0]} ↔ {maxSim.files[1]}</p>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Lowest</p>
            <p className="text-lg font-bold text-success">{minSim.value}%</p>
            <p className="text-xs text-muted-foreground truncate">{minSim.files[0]} ↔ {minSim.files[1]}</p>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-lg font-bold text-primary">{avgSim}%</p>
            <p className="text-xs text-muted-foreground">across {count} pairs</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Files</p>
            <p className="text-lg font-bold text-accent">{fileNames.length}</p>
            <p className="text-xs text-muted-foreground">{count} comparisons</p>
          </div>
        </div>
        
        {/* Matrix Grid */}
        <div className="overflow-auto">
          <div className="inline-block">
            <div className="flex gap-0.5 mb-1 ml-20">
              {fileNames.map((name, j) => (
                <div key={j} className="w-8 text-[8px] text-muted-foreground/50 text-center truncate rotate-45" style={{height: '40px'}}>
                  {name.slice(0, 8)}
                </div>
              ))}
            </div>
            {matrix.map((row, i) => (
              <div key={i} className="flex gap-0.5 items-center">
                <span className="w-20 text-[10px] text-muted-foreground text-right pr-2 truncate">{fileNames[i].slice(0, 12)}</span>
                {row.map((val, j) => {
                  const isDiagonal = i === j;
                  const isSelected = selectedPair !== undefined && 
                    ((i === data.pairResults[selectedPair]?.i && j === data.pairResults[selectedPair]?.j) ||
                     (i === data.pairResults[selectedPair]?.j && j === data.pairResults[selectedPair]?.i));
                  
                  let bgColor = "bg-secondary/30";
                  if (isDiagonal) bgColor = "bg-blue-500/30";
                  else if (val >= 65) bgColor = "bg-destructive/80";
                  else if (val >= 30) bgColor = "bg-warning/60";
                  else bgColor = "bg-success/40";
                  
                  return (
                    <div
                      key={j}
                      className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-mono ${bgColor} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      title={`${fileNames[i]} vs ${fileNames[j]}: ${val}%`}
                    >
                      {val}%
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-500/30" /> Same file</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive/80" /> High (65%+)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-warning/60" /> Medium (30-64%)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-success/40" /> Low (0-29%)</div>
        </div>
      </div>
    );
  }
  
  // Single pair heatmap (line-by-line)
  const maxLineA = Math.max(...result.tokensA.map((t: Token) => t.line), 0);
  const maxLineB = Math.max(...result.tokensB.map((t: Token) => t.line), 0);
  const gridSize = Math.min(maxLineA, 30);
  const gridSizeB = Math.min(maxLineB, 30);

  const heat: number[][] = Array.from({ length: gridSize }, () => Array(gridSizeB).fill(0));
  result.matchedLines.forEach((m: any) => {
    if (m.lineA <= gridSize && m.lineB <= gridSizeB) {
      heat[m.lineA - 1][m.lineB - 1] = 1;
    }
  });

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <p className="font-mono text-sm text-primary mb-4">Line-by-Line Similarity Heatmap</p>
      {gridSize === 0 || gridSizeB === 0 ? (
        <p className="text-muted-foreground text-sm">Not enough data to generate heatmap.</p>
      ) : (
        <div className="overflow-auto">
          <div className="inline-block">
            <div className="flex gap-0.5 mb-1 ml-8">
              {Array.from({ length: gridSizeB }, (_, j) => (
                <div key={j} className="w-4 text-[8px] text-muted-foreground/50 text-center">{j + 1}</div>
              ))}
            </div>
            {heat.map((row, i) => (
              <div key={i} className="flex gap-0.5 items-center">
                <span className="w-7 text-[8px] text-muted-foreground/50 text-right pr-1">{i + 1}</span>
                {row.map((val, j) => (
                  <div
                    key={j}
                    className={`w-4 h-4 rounded-sm transition-colors ${
                      val ? "bg-primary" : "bg-secondary/50"
                    }`}
                    title={`A:${i + 1} vs B:${j + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-secondary/50" /> No match</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary" /> Match</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualizationPage;
