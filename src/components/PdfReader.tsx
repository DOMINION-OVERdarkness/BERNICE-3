import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  BookOpen,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
  HardDrive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { StudyNote, Level, Faculty } from '../types.ts';
import { api } from '../services/api.ts';
import { pdfjsLib } from '../utils/pdfWorker.ts';
import { offlineStorage } from '../services/offlineStorage.ts';

interface PdfReaderProps {
  note: StudyNote;
  onBackToCourseList: () => void;
  onBackToFaculty: () => void;
  onBackToLevel: () => void;
  initialStartReadAloud?: boolean;
}

type ReaderTheme = 'day' | 'sepia' | 'night';

export const PdfReader: React.FC<PdfReaderProps> = ({
  note,
  onBackToCourseList,
  onBackToFaculty,
  onBackToLevel,
  initialStartReadAloud = false,
}) => {
  // Document state
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [theme, setTheme] = useState<ReaderTheme>('day');
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [useNativeViewer, setUseNativeViewer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // In-App Download state
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);

  // Read Aloud State
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [readSpeed, setReadSpeed] = useState<number>(1.0);
  const [currentTextChunk, setCurrentTextChunk] = useState<string>('');
  const [pageTextMap, setPageTextMap] = useState<Record<number, string>>({});
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrApplied, setOcrApplied] = useState<boolean>(false);
  const [readAloudNotice, setReadAloudNotice] = useState<string | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const readerCardRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fullDocumentOcrRef = useRef<string | null>(note.ocrText || null);

  // Mobile Touch Gestures (Swipe to flip pages & double-tap to zoom)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  const pdfUrl = api.getPdfUrl(note.id);

  // Check if already downloaded in-app
  useEffect(() => {
    async function checkStatus() {
      const downloaded = await offlineStorage.isDownloaded(note.id);
      setIsDownloaded(downloaded);
    }
    checkStatus();
  }, [note.id]);

  // Initialize PDF.js document (from offline local blob if available or network)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setRenderError(null);

    async function initializePdf() {
      try {
        let docSourceUrl = pdfUrl;
        const offlineUrl = await offlineStorage.getOfflineBlobUrl(note.id);
        if (offlineUrl) {
          docSourceUrl = offlineUrl;
        }

        const loadingTask = pdfjsLib.getDocument({
          url: docSourceUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;
        pdfDocRef.current = loadedDoc;
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);

        // Compute optimal initial scale for mobile screens (iPhone / Android)
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        if (screenWidth < 640) {
          // Standard PDF page width is ~612pt
          const mobileScale = Math.min(Math.max(Number(((screenWidth - 28) / 612).toFixed(2)), 0.52), 1.15);
          setScale(mobileScale);
        } else {
          setScale(1.1);
        }

        setLoading(false);

        // Pre-extract page texts in background for read-aloud
        extractPagesText(loadedDoc);
      } catch (err: any) {
        console.warn('PDF.js loading failed, switching to native fallback:', err);
        if (isMounted) {
          setRenderError(err?.message || 'Could not initialize canvas PDF renderer');
          setUseNativeViewer(true);
          setLoading(false);
        }
      }
    }

    initializePdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
      }
      stopSpeech();
    };
  }, [pdfUrl, note.id]);

  // In-App Download action
  const handleInAppDownload = async () => {
    try {
      setDownloading(true);
      setDownloadProgress(0);
      setDownloadNotice('Downloading into in-app offline storage...');

      await offlineStorage.saveNoteInApp(note, (pct) => {
        setDownloadProgress(pct);
      });

      setIsDownloaded(true);
      setDownloadNotice('Download complete! This note is now stored in-app and can be read 100% offline without internet.');
      setTimeout(() => setDownloadNotice(null), 6000);
    } catch (err: any) {
      console.error('In-app download error:', err);
      setDownloadNotice(`In-app download failed: ${err.message || 'Error saving file'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleRemoveInApp = async () => {
    try {
      await offlineStorage.removeOfflineNote(note.id);
      setIsDownloaded(false);
      setShowDownloadMenu(false);
      setDownloadNotice('Note removed from in-app storage.');
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to remove offline note:', err);
    }
  };

  const handleExportToFile = () => {
    const downloadUrl = api.getDownloadUrl(note.id);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = note.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowDownloadMenu(false);
  };

  // Extract text from all pages for speech synthesis
  const extractPagesText = async (doc: any) => {
    const textMap: Record<number, string> = {};
    for (let p = 1; p <= doc.numPages; p++) {
      try {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const extracted = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        textMap[p] = extracted;
      } catch (e) {
        console.warn(`Error extracting text from page ${p}:`, e);
      }
    }
    setPageTextMap(textMap);
  };

  // Render current page onto canvas
  const renderPage = useCallback(
    async (pageNum: number, currentScale: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate pixel ratio for crisp text on mobile Retina screens
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    },
    []
  );

  // Re-render when page, scale, or view mode changes
  useEffect(() => {
    if (!loading && !useNativeViewer && pdfDocRef.current) {
      renderPage(currentPage, scale);
    }
  }, [currentPage, scale, loading, useNativeViewer, renderPage]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!readerCardRef.current) return;
    if (!document.fullscreenElement) {
      readerCardRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.8));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.1);
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 28;
      // Standard PDF page width is ~612pt
      const newScale = Math.max(containerWidth / 612, 0.55);
      setScale(Number(newScale.toFixed(2)));
    }
  };

  // Mobile Touch Gestures (Swipe to flip pages)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    // Detect horizontal swipe on touch screen (Android / iPhone)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        // Swiped left -> Next page
        goToNextPage();
      } else {
        // Swiped right -> Previous page
        goToPrevPage();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Double-tap on canvas to zoom in / reset
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setScale((prev) => (prev > 1.2 ? 0.95 : 1.6));
    }
    lastTapRef.current = now;
  };

  // ==========================================
  // READ ALOUD / SPEECH SYNTHESIS ENGINE
  // ==========================================

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
    setCurrentTextChunk('');
  };

  const speakText = (textToRead: string, onEnded?: () => void) => {
    if (!('speechSynthesis' in window)) {
      setReadAloudNotice('Your browser does not support Speech Synthesis.');
      return;
    }

    window.speechSynthesis.cancel();

    if (!textToRead || textToRead.trim().length === 0) {
      setReadAloudNotice('No extractable text found on this page.');
      setIsReading(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utteranceRef.current = utterance;
    utterance.rate = readSpeed;
    utterance.lang = 'en-US';

    // Highlight sentence chunks
    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.name === 'word') {
        const charIndex = event.charIndex;
        // Show context slice
        const excerpt = textToRead.slice(charIndex, charIndex + 140);
        setCurrentTextChunk(excerpt);
      }
    };

    utterance.onstart = () => {
      setIsReading(true);
      setIsPaused(false);
      setReadAloudNotice(null);
    };

    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      setCurrentTextChunk('');
      if (onEnded) onEnded();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsReading(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start reading aloud from current page
  const handleStartReadAloud = async () => {
    // Check if we have extracted text on current page
    let pageText = pageTextMap[currentPage];

    // If text is empty or very short, check cached OCR text
    if (!pageText || pageText.trim().length < 20) {
      if (fullDocumentOcrRef.current) {
        pageText = fullDocumentOcrRef.current;
      }
    }

    if (!pageText || pageText.trim().length < 20) {
      // Scanned document prompt
      setReadAloudNotice(
        'This page appears to contain scanned or non-extractable text. Click "Extract with AI OCR" below to transcribe it with Gemini OCR.'
      );
      return;
    }

    setCurrentTextChunk(pageText.slice(0, 100) + '...');
    speakText(pageText, () => {
      // Move to next page if available
      if (currentPage < numPages) {
        setCurrentPage((prev) => prev + 1);
      }
    });
  };

  const handlePauseResume = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setReadSpeed(speed);
    if (isReading) {
      // Restart current speech with new speed
      const textToRead = pageTextMap[currentPage] || fullDocumentOcrRef.current || '';
      speakText(textToRead);
    }
  };

  // Run Gemini OCR fallback
  const handleTriggerOcr = async () => {
    try {
      setOcrLoading(true);
      setReadAloudNotice('Contacting University AI OCR Engine to transcribe PDF lecture note...');
      const ocrResult = await api.requestOcrText(note.id);
      fullDocumentOcrRef.current = ocrResult;
      setOcrApplied(true);
      setReadAloudNotice('OCR transcription completed successfully! Starting read aloud...');
      setOcrLoading(false);

      speakText(ocrResult);
    } catch (err: any) {
      setOcrLoading(false);
      setReadAloudNotice(`OCR error: ${err.message || 'Could not transcribe document.'}`);
    }
  };

  // Start read aloud automatically if requested from course list
  useEffect(() => {
    if (initialStartReadAloud && !loading) {
      const timer = setTimeout(() => {
        handleStartReadAloud();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [initialStartReadAloud, loading]);

  // Page navigation
  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Reader paper theme classes
  const themeClasses: Record<ReaderTheme, { container: string; toolbar: string; paper: string }> = {
    day: {
      container: 'bg-slate-100',
      toolbar: 'bg-white border-slate-200 text-slate-800',
      paper: 'bg-white text-slate-900 shadow-2xl border border-slate-200',
    },
    sepia: {
      container: 'bg-[#f4ecd8]',
      toolbar: 'bg-[#ece0c8] border-[#dfd0b2] text-[#433422]',
      paper: 'bg-[#fbf0d9] text-[#3b2c1a] shadow-2xl border border-[#dfd0b2]',
    },
    night: {
      container: 'bg-slate-950',
      toolbar: 'bg-slate-900 border-slate-800 text-slate-200',
      paper: 'bg-slate-900 text-slate-100 shadow-2xl border border-slate-800',
    },
  };

  return (
    <div
      ref={readerCardRef}
      className={`min-h-screen flex flex-col transition-colors duration-200 ${themeClasses[theme].container} pb-16`}
    >
      {/* Top E-Book Header & Navigation Bar */}
      <div className={`sticky top-0 z-30 border-b px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md ${themeClasses[theme].toolbar}`}>
        {/* Left: Back Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToCourseList}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Course Notes</span>
          </button>

          <span className="text-slate-300 hidden md:inline">|</span>

          <div className="hidden sm:flex items-center space-x-2 max-w-[280px] lg:max-w-md truncate">
            <img
              src="/logo.png"
              alt="BUB"
              className="w-6 h-6 rounded-full object-contain shrink-0 bg-white p-0.5 border border-amber-300 shadow-xs"
            />
            <div className="truncate">
              <h2 className="text-xs font-extrabold text-slate-900 truncate">
                {note.courseTitle}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {note.topic}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Read Aloud Master Controls */}
        <div className="flex items-center space-x-2 bg-purple-50/80 border border-purple-200/80 px-2.5 py-1 rounded-xl">
          {!isReading ? (
            <button
              onClick={handleStartReadAloud}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs transition cursor-pointer shadow-sm"
              title="Read text aloud using speech synthesizer"
            >
              <Volume2 className="w-4 h-4 text-purple-950" />
              <span>Read Aloud</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePauseResume}
                className="p-1.5 rounded-lg bg-purple-900 text-amber-300 hover:bg-purple-800 text-xs font-semibold flex items-center transition cursor-pointer"
                title={isPaused ? 'Resume reading' : 'Pause reading'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={stopSpeech}
                className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold flex items-center transition cursor-pointer"
                title="Stop reading aloud"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center space-x-1 pl-1 border-l border-purple-300 text-[11px]">
                <span className="text-purple-900 font-bold">Speed:</span>
                {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      readSpeed === spd
                        ? 'bg-purple-900 text-amber-300'
                        : 'text-purple-800 hover:bg-purple-200/60'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Theme, Zoom, Viewer mode, Download */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Theme Switcher */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setTheme('day')}
              className={`p-1.5 rounded-md ${theme === 'day' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
              title="Day Mode (Crisp White)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded-md ${theme === 'sepia' ? 'bg-[#fbf0d9] shadow-xs text-[#3b2c1a]' : 'text-slate-500'}`}
              title="Sepia Reading Tone (Eye Comfort)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            </button>
            <button
              onClick={() => setTheme('night')}
              className={`p-1.5 rounded-md ${theme === 'night' ? 'bg-slate-900 shadow-xs text-amber-400' : 'text-slate-500'}`}
              title="Night Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reading Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* IN-APP DOWNLOAD BUTTON & MENU */}
          <div className="relative">
            {downloading ? (
              <button
                disabled
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Downloading {downloadProgress}%</span>
              </button>
            ) : isDownloaded ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  title="Note is stored in-app for offline reading. Tap for options."
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span className="hidden xs:inline">Saved In-App</span>
                </button>

                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs text-slate-700 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded">
                      Available Offline
                    </div>
                    <button
                      onClick={handleExportToFile}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center space-x-2 text-slate-700 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export to Device</span>
                    </button>
                    <button
                      onClick={handleRemoveInApp}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 flex items-center space-x-2 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Remove from App</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleInAppDownload}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                title="Download this lecture note into app storage for offline studying without data"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden xs:inline">Download In-App</span>
                <span className="xs:hidden">Download</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Download Status Notification */}
      {downloadNotice && (
        <div className="bg-emerald-900 text-emerald-100 px-4 py-2 text-xs flex items-center justify-between border-b border-emerald-800 shadow-inner">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
          <button
            onClick={() => setDownloadNotice(null)}
            className="text-emerald-300 hover:text-white underline cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Read Aloud Teleprompter / Status Bar */}
      {(isReading || currentTextChunk || readAloudNotice) && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-800/80 shadow-inner">
          <div className="flex items-center space-x-2.5 max-w-3xl overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center shrink-0 font-bold">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="truncate text-purple-100">
              {isReading && currentTextChunk ? (
                <span>
                  <strong className="text-amber-300 font-semibold mr-1.5">Speaking:</strong>
                  &ldquo;{currentTextChunk}&rdquo;
                </span>
              ) : (
                <span>{readAloudNotice || 'Read aloud initialized.'}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* If user needs OCR transcription */}
            {(!pageTextMap[currentPage] || pageTextMap[currentPage].length < 20) && !ocrApplied && (
              <button
                onClick={handleTriggerOcr}
                disabled={ocrLoading}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs flex items-center space-x-1 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {ocrLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transcribing via OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extract with AI OCR</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={stopSpeech}
              className="text-purple-300 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Page Navigation & Zoom Toolbar */}
      {!useNativeViewer && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-3 pb-1 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Page Jump & Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Prev Page</span>
            </button>

            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-xs font-bold text-slate-800">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && val <= numPages) setCurrentPage(val);
                }}
                className="w-10 text-center font-bold text-purple-900 border-b border-purple-300 focus:outline-none"
              />
              <span className="text-slate-400">of</span>
              <span>{numPages || 1}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <span className="hidden xs:inline">Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 py-1 text-slate-600 font-bold bg-white border border-slate-300 rounded-lg shadow-xs">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitWidth}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs cursor-pointer"
              title="Fit to reader width"
            >
              Fit Width
            </button>
            <button
              onClick={() => setUseNativeViewer(true)}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-medium shadow-xs cursor-pointer"
              title="Switch to browser native PDF viewer"
            >
              Native View
            </button>
          </div>
        </div>
      )}

      {/* Main E-Book Reading Canvas / Container */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-start p-2 sm:p-6 overflow-auto scroll-touch relative"
      >
        {loading ? (
          <div className="my-auto py-20 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-purple-900 animate-spin mx-auto" />
            <div className="text-slate-600 font-semibold text-sm">
              Rendering Lecture Note E-Book...
            </div>
            <p className="text-xs text-slate-400">
              Preserving original lecture layout, diagrams, formulas, and text.
            </p>
          </div>
        ) : useNativeViewer ? (
          /* Native PDF Iframe Mode */
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden flex flex-col">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Native Browser PDF Viewer</span>
              <button
                onClick={() => setUseNativeViewer(false)}
                className="px-3 py-1.5 rounded-lg bg-purple-900 text-amber-300 font-bold hover:bg-purple-800 transition cursor-pointer active:scale-95 min-h-[36px]"
              >
                Return to E-Book Canvas Reader
              </button>
            </div>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title={note.courseTitle}
            />
          </div>
        ) : (
          /* E-Book Canvas Mode */
          <div className="relative flex flex-col items-center w-full max-w-4xl pb-20 sm:pb-12">
            {/* Academic Page Header banner */}
            <div className="w-full max-w-3xl mb-2 px-2 py-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="truncate">Bernice University Buea Academic Note</span>
              <span className="shrink-0 font-medium ml-2">
                {note.level} • {currentPage}/{numPages || 1}
              </span>
            </div>

            {/* Mobile swipe gesture guide banner */}
            <div className="w-full max-w-3xl mb-1.5 px-3 py-1 bg-purple-50/70 border border-purple-200/50 rounded-lg text-[10px] text-purple-800 flex items-center justify-between sm:hidden">
              <span>👉 Swipe left/right or tap edges to flip pages</span>
              <span>Double-tap to zoom</span>
            </div>

            {/* Canvas Page with Touch Gestures */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleDoubleTap}
              className={`rounded-2xl transition-all duration-200 ${themeClasses[theme].paper} overflow-hidden relative cursor-pointer select-none`}
              style={{
                maxWidth: '100%',
              }}
              title="Double tap to zoom, swipe left/right to change pages"
            >
              {/* Left edge tap zone (hidden touch target for quick previous page) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevPage();
                }}
                className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 z-10 opacity-0 hover:opacity-10 bg-purple-900/10 flex items-center justify-start pl-1 cursor-pointer transition-opacity"
                title="Previous page"
              />

              <canvas ref={canvasRef} className="block mx-auto max-w-full h-auto" />

              {/* Right edge tap zone (hidden touch target for quick next page) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextPage();
                }}
                className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 z-10 opacity-0 hover:opacity-10 bg-purple-900/10 flex items-center justify-end pr-1 cursor-pointer transition-opacity"
                title="Next page"
              />
            </div>

            {/* Bottom floating pagination dock with iPhone safe-area padding and 44px+ touch targets */}
            <div className="fixed bottom-safe left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 shadow-2xl px-4 py-2 rounded-2xl text-xs font-bold text-white transition-all">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 transition"
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-5 h-5 text-amber-300" />
              </button>

              <div className="flex items-center space-x-1.5 px-2 text-slate-100 text-xs">
                <span>Page</span>
                <span className="text-amber-300 font-extrabold text-sm">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-300">{numPages || 1}</span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 transition"
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight className="w-5 h-5 text-amber-300" />
              </button>

              <button
                onClick={handleFitWidth}
                className="hidden xs:flex min-h-[36px] px-2.5 py-1 rounded-lg bg-amber-400 text-purple-950 font-bold text-[11px] items-center justify-center cursor-pointer active:scale-95"
                title="Fit page width"
              >
                Fit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
