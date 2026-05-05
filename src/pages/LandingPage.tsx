import { useNavigate } from "react-router-dom";
import { Bug, Shield, Zap, Code2, GitCompare, BarChart3, FileSearch, Layers, Eye, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      {/* Ambient glow - stronger and centered */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="p-5 rounded-2xl bg-primary/10 glow-primary mb-6 border border-primary/20">
          <Bug className="w-14 h-14 text-primary" />
        </div>
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-4">
          <span className="text-gradient-primary">PARASITE</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-mono mb-4">
          Compiler-Based Plagiarism Detection
        </p>
        <p className="text-muted-foreground max-w-2xl mb-12 leading-relaxed text-lg">
          A powerful source code plagiarism detection system that analyzes structural similarity
          across multiple files through tokenization, identifier normalization, and intelligent
          n-gram pattern matching. Supports C, Java, and Python.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate("/upload")}
            className="group px-10 py-5 bg-primary text-primary-foreground font-semibold rounded-xl text-xl transition-all hover:scale-105 glow-primary hover:glow-strong hover:shadow-xl hover:shadow-primary/25 border border-primary/50 flex items-center gap-3"
          >
            <Zap className="w-5 h-5 group-hover:animate-bounce" /> Start Checking <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            className="px-10 py-5 bg-card/80 backdrop-blur border border-border text-foreground font-semibold rounded-xl text-xl transition-all hover:bg-card hover:border-primary/30 hover:-translate-y-1 card-hover"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">Key Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Layers, title: "Multi-File Comparison", desc: "Compare 2 or more source code files at once with a full similarity matrix" },
            { icon: Code2, title: "Token Analysis", desc: "Deep tokenization with identifier normalization to catch structural plagiarism" },
            { icon: GitCompare, title: "N-Gram Matching", desc: "Trigram-based similarity detection that goes beyond simple text comparison" },
            { icon: Shield, title: "Multi-Language", desc: "Full support for C, Java, and Python with language-aware keyword handling" },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:-translate-y-1 card-hover group">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 px-4 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h2>
        <div className="space-y-6">
          {[
            { step: "01", icon: FileSearch, title: "Upload Code", desc: "Paste or upload multiple source code files in C, Java, or Python. Add as many files as you need to compare." },
            { step: "02", icon: Code2, title: "Preprocessing & Tokenization", desc: "Comments and whitespace are removed, then code is split into tokens. Variable names are normalized to detect renamed-variable plagiarism." },
            { step: "03", icon: GitCompare, title: "Similarity Detection", desc: "Token sequences are compared using n-gram (trigram) matching across all file pairs to calculate structural similarity scores." },
            { step: "04", icon: BarChart3, title: "Results & Visualization", desc: "View a similarity matrix, side-by-side code comparison with highlighted matches, token tables, AST overviews, and heatmaps." },
          ].map((item) => (
            <div key={item.step} className="flex gap-5 items-start p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:-translate-y-1 card-hover transition-all">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="text-primary font-bold font-mono">{item.step}</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-primary" /> {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Detect Plagiarism?</h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Upload your source code files and get instant similarity analysis with detailed visualizations.
        </p>
        <button
          onClick={() => navigate("/upload")}
          className="px-10 py-5 bg-primary text-primary-foreground font-semibold rounded-xl text-xl transition-all hover:scale-105 glow-primary hover:glow-strong hover:shadow-xl hover:shadow-primary/25 border border-primary/50 flex items-center gap-3 mx-auto"
        >
          <Eye className="w-5 h-5" /> Get Started
        </button>
      </section>
    </div>
  );
};

export default LandingPage;
