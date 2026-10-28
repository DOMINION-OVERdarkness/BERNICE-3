import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for pdfjs-dist
// We use a reliable CDN worker or local bundled worker
try {
  // Using unpkg/cdnjs worker matching the version or standard legacy fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup warning:', e);
}

export { pdfjsLib };
