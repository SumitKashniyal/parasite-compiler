import { jsPDF } from 'jspdf';
import type { EnhancedComparisonResult, ReportSection, GraphNode, GraphEdge } from './plagiarism';

export interface PDFReportOptions {
  title?: string;
  author?: string;
  includeCodeSnippets?: boolean;
  includeCharts?: boolean;
}

export async function generatePDFReport(
  result: EnhancedComparisonResult,
  fileNameA: string,
  fileNameB: string,
  options: PDFReportOptions = {}
): Promise<Blob> {
  const {
    title = 'Plagiarism Detection Report',
    author = 'Parasite Compiler',
    includeCodeSnippets = true,
    includeCharts = true
  } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkNewPage = (height: number) => {
    if (yPos + height > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // File names
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Compared Files:', margin, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• ${fileNameA}`, margin + 5, yPos);
  yPos += 6;
  doc.text(`• ${fileNameB}`, margin + 5, yPos);
  yPos += 15;

  // Summary section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  yPos += 10;

  // Similarity scores
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Combined Similarity', `${result.combinedSimilarity}%`],
    ['Structural Similarity', `${result.astResult?.structuralSimilarity || 0}%`],
    ['Token Similarity', `${result.similarity}%`],
    ['Classification', result.astResult?.plagiarismType.type.toUpperCase() || 'N/A'],
    ['Confidence', `${result.astResult?.plagiarismType.confidence || 0}%`]
  ];

  for (const [label, value] of summaryData) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 60, yPos);
    yPos += 7;
  }
  yPos += 5;

  // Plagiarism type description
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(result.astResult?.plagiarismType.description || '', margin, yPos);
  doc.setTextColor(0);
  yPos += 15;

  // Matched lines count
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Matched Lines', margin, yPos);
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${result.matchedLines.length} matching lines identified`, margin, yPos);
  yPos += 15;

  // Include code snippets if enabled
  if (includeCodeSnippets && result.matchedLines.length > 0) {
    checkNewPage(60);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Matched Code Segments', margin, yPos);
    yPos += 10;

    doc.setFontSize(9);
    const maxSnippets = Math.min(5, result.matchedLines.length);
    
    for (let i = 0; i < maxSnippets; i++) {
      checkNewPage(25);
      const match = result.matchedLines[i];
      const snippet = match.content.substring(0, 80);
      
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 3, contentWidth, 8, 'F');
      doc.text(`Line ${match.lineA} (File A) ↔ Line ${match.lineB} (File B)`, margin + 2, yPos + 2);
      yPos += 8;
      
      doc.setFont('courier', 'normal');
      doc.text(snippet, margin + 5, yPos + 2);
      yPos += 12;
    }

    if (result.matchedLines.length > maxSnippets) {
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${result.matchedLines.length - maxSnippets} more matches`, margin, yPos);
      yPos += 10;
    }
  }

  // Simple bar chart for similarity (ASCII-style in PDF)
  if (includeCharts) {
    checkNewPage(50);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Similarity Visualization', margin, yPos);
    yPos += 15;

    const drawBar = (label: string, value: number, color: number[]) => {
      const barWidth = (value / 100) * (contentWidth - 60);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin, yPos + 4);
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin + 60, yPos, barWidth, 6, 'F');
      
      doc.text(`${value}%`, margin + 62 + barWidth + 5, yPos + 4);
      yPos += 12;
    };

    drawBar('Combined', result.combinedSimilarity, [59, 130, 246]);
    drawBar('Structural', result.astResult?.structuralSimilarity || 0, [34, 197, 94]);
    drawBar('Token-based', result.similarity, [249, 115, 22]);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | ${author}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

// Generate network graph data for visualization component
export interface NetworkGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function prepareNetworkGraphData(
  nodes: GraphNode[],
  edges: GraphEdge[]
): NetworkGraphData {
  return { nodes, edges };
}

// Export as downloadable file
export function downloadPDFReport(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}