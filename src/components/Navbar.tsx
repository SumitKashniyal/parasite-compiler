import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Bug, Upload, BarChart3, Eye, Home } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/results", label: "Results", icon: BarChart3 },
  { path: "/visualization", label: "Visualization", icon: Eye },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3 text-primary font-mono font-bold text-lg tracking-tight group">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Bug className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PARASITE</span>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === path
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
