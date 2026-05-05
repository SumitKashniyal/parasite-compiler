import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileCode, ArrowRight, Plus, X } from "lucide-react";

const LANGUAGES = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
];

interface CodeEntry {
  id: string;
  name: string;
  code: string;
}

let nextId = 1;
const makeEntry = (name?: string): CodeEntry => ({
  id: String(nextId++),
  name: name || `File ${nextId - 1}`,
  code: "",
});

const UploadPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CodeEntry[]>([makeEntry("File 1"), makeEntry("File 2")]);
  const [language, setLanguage] = useState("c");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateEntry = (id: string, updates: Partial<CodeEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, makeEntry(`File ${prev.length + 1}`)]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleFile = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateEntry(id, { code: reader.result as string, name: file.name });
    };
    reader.readAsText(file);
  };

  const canCompare = entries.filter((e) => e.code.trim()).length >= 2;

  const handleCompare = () => {
    if (!canCompare) return;
    const filled = entries.filter((e) => e.code.trim());
    sessionStorage.setItem("parasite_codes", JSON.stringify(filled.map((e) => e.code)));
    sessionStorage.setItem("parasite_names", JSON.stringify(filled.map((e) => e.name)));
    sessionStorage.setItem("parasite_lang", language);
    navigate("/processing");
  };

  return (
    <div className="min-h-screen bg-background bg-grid p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gradient-primary mb-2">Upload Source Code</h1>
        <p className="text-muted-foreground mb-6">
          Paste or upload two or more source code files to compare
        </p>

        {/* Language selector + Add file */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-mono">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={addEntry}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2 text-sm font-medium transition-colors mt-auto"
          >
            <Plus className="w-4 h-4" /> Add File
          </button>
        </div>

        {/* Code entries grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileCode className="w-4 h-4 text-primary shrink-0" />
                  <input
                    value={entry.name}
                    onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                    className="font-mono text-sm text-primary bg-transparent border-none outline-none flex-1 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => fileRefs.current[entry.id]?.click()}
                    className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  {entries.length > 2 && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={(el) => { fileRefs.current[entry.id] = el; }}
                  type="file"
                  accept=".c,.cpp,.h,.hpp,.java,.py,.php,.sql,.txt"
                  className="hidden"
                  onChange={handleFile(entry.id)}
                />
              </div>
              <textarea
                value={entry.code}
                onChange={(e) => updateEntry(entry.id, { code: e.target.value })}
                placeholder={`Paste code here...`}
                className="flex-1 min-h-[280px] p-4 rounded-xl bg-card border border-border text-foreground font-mono text-sm leading-relaxed resize-none focus:outline-none focus:glow-border placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleCompare}
            disabled={!canCompare}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 glow-primary"
          >
            Compare Code <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
