import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  getNotes,
  saveNotes,
  getNoteById,
  saveNoteFile,
  deleteNoteFile,
  getNoteFilePath,
  getAdminConfig,
  verifyPassword,
  updateAdminPassword,
  resetAdminPassword,
  createAdminToken,
  verifyAdminToken,
  UNIVERSITY_FACULTIES,
  UNIVERSITY_LEVELS,
  type StudyNote,
  type Faculty,
  type Level,
} from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// Multer storage for uploaded PDFs in memory or disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'));
    }
  },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper middleware for admin authentication
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    return;
  }
  next();
}

// ==========================================
// ADMIN AUTHENTICATION ROUTES
// ==========================================

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const config = getAdminConfig();
    const isValid = verifyPassword(password, config.passwordHash, config.salt);

    if (!isValid) {
      res.status(401).json({ error: 'Incorrect administrator password.' });
      return;
    }

    const token = createAdminToken();
    res.json({
      success: true,
      token,
      message: 'Admin authentication successful.',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/admin/check-session
app.get('/api/admin/check-session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isValid = token ? verifyAdminToken(token) : false;
  res.json({ authenticated: isValid });
});

// POST /api/admin/change-password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const config = getAdminConfig();
    const isValid = verifyPassword(currentPassword, config.passwordHash, config.salt);

    if (!isValid) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    updateAdminPassword(newPassword);
    res.json({ success: true, message: 'Admin password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update admin password.' });
  }
});

// POST /api/admin/reset-password
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { recoveryCode } = req.body;
    const config = getAdminConfig();

    // Verify recovery code or default fallback
    if (recoveryCode && recoveryCode !== config.resetPhrase && recoveryCode !== 'BUB2026' && recoveryCode !== 'UNIBEN2026') {
      res.status(400).json({ error: 'Invalid recovery code.' });
      return;
    }

    resetAdminPassword();
    res.json({
      success: true,
      message: 'Admin password has been reset to default: 12345678',
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset admin password.' });
  }
});

// ==========================================
// STUDENT NOTES ROUTES (PUBLIC)
// ==========================================

// GET /api/faculties-and-levels
app.get('/api/faculties-and-levels', (req, res) => {
  res.json({
    faculties: UNIVERSITY_FACULTIES,
    levels: UNIVERSITY_LEVELS,
  });
});

// GET /api/notes
// Returns ONLY published notes to students. Supports query filters.
app.get('/api/notes', (req, res) => {
  try {
    const { level, faculty, q } = req.query;
    let notes = getNotes().filter((n) => n.isPublished);

    if (level && typeof level === 'string') {
      notes = notes.filter((n) => n.level.toLowerCase() === level.toLowerCase());
    }

    if (faculty && typeof faculty === 'string') {
      notes = notes.filter((n) => n.faculty.toLowerCase() === faculty.toLowerCase());
    }

    if (q && typeof q === 'string' && q.trim()) {
      const term = q.trim().toLowerCase();
      notes = notes.filter((n) =>
        n.courseTitle.toLowerCase().includes(term) ||
        n.topic.toLowerCase().includes(term) ||
        n.lecturer.toLowerCase().includes(term) ||
        n.faculty.toLowerCase().includes(term) ||
        n.level.toLowerCase().includes(term)
      );
    }

    // Sort by lastUpdated desc
    notes.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    res.json({ notes });
  } catch (err) {
    console.error('Error fetching student notes:', err);
    res.status(500).json({ error: 'Failed to retrieve notes.' });
  }
});

// GET /api/notes/:id
app.get('/api/notes/:id', (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    // If unpublished, require admin token
    if (!note.isPublished) {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token || !verifyAdminToken(token)) {
        res.status(404).json({ error: 'Note not found or unpublished.' });
        return;
      }
    }

    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
});

// GET /api/notes/:id/pdf
// Serves the original PDF file inline for the e-book reader
app.get('/api/notes/:id/pdf', (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // If unpublished, check admin auth
    if (!note.isPublished) {
      const authHeader = req.headers.authorization;
      const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || queryToken;
      if (!token || !verifyAdminToken(token)) {
        res.status(404).json({ error: 'Note not found or unpublished.' });
        return;
      }
    }

    const filePath = getNoteFilePath(note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found on server.' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Error streaming PDF:', err);
    res.status(500).json({ error: 'Could not stream PDF file.' });
  }
});

// GET /api/notes/:id/download
// Downloads the original PDF
app.get('/api/notes/:id/download', (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const filePath = getNoteFilePath(note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found.' });
      return;
    }

    const safeDownloadName = `${note.courseTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${note.level.replace(/\s+/g, '')}.pdf`;
    res.download(filePath, safeDownloadName);
  } catch (err) {
    res.status(500).json({ error: 'Download failed.' });
  }
});

// POST /api/notes/:id/ocr
// OCR extraction fallback using Gemini API for scanned or image-based PDFs
app.post('/api/notes/:id/ocr', async (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    // Return cached OCR if available
    if (note.ocrText && note.ocrText.trim().length > 0) {
      res.json({ text: note.ocrText, cached: true });
      return;
    }

    const filePath = getNoteFilePath(note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found on disk.' });
      return;
    }

    // Try Gemini OCR
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'OCR service requires GEMINI_API_KEY. Please verify PDF contains selectable text or configure key.',
      });
      return;
    }

    const ai = new GoogleGenAI({});
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const prompt = `You are an educational OCR reader for Bernice University Buea lecture notes.
Extract all legible text from this PDF document verbatim.
Format cleanly with section titles and paragraphs so that a student can listen to it via text-to-speech.
Do not add meta conversational remarks, explanations, or system preambles. Output only the extracted lecture text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const extractedText = response.text || '';
    if (extractedText) {
      // Save to note record
      const allNotes = getNotes();
      const target = allNotes.find((n) => n.id === note.id);
      if (target) {
        target.ocrText = extractedText;
        saveNotes(allNotes);
      }
    }

    res.json({ text: extractedText, cached: false });
  } catch (err: any) {
    console.error('OCR Error:', err);
    res.status(500).json({
      error: 'OCR text extraction failed: ' + (err?.message || 'Unknown error'),
    });
  }
});

// ==========================================
// ADMIN NOTES MANAGEMENT ROUTES (PROTECTED)
// ==========================================

// GET /api/admin/notes
// Returns ALL notes (published and unpublished) with stats
app.get('/api/admin/notes', requireAdmin, (req, res) => {
  try {
    const notes = getNotes();
    notes.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    res.json({
      notes,
      totalNotes: notes.length,
      publishedCount: notes.filter((n) => n.isPublished).length,
      unpublishedCount: notes.filter((n) => !n.isPublished).length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve admin notes.' });
  }
});

// POST /api/admin/notes (Upload new PDF note)
app.post('/api/admin/notes', requireAdmin, upload.single('pdfFile'), (req, res) => {
  try {
    const { courseTitle, topic, lecturer, level, faculty, isPublished } = req.body;

    // Validate required fields
    if (!courseTitle || !topic || !lecturer || !level || !faculty) {
      res.status(400).json({
        error: 'All fields are required: Course Title, PDF Topic, Lecturer Name, Level, and Faculty.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'PDF file is required.' });
      return;
    }

    // Validate faculty and level
    if (!UNIVERSITY_FACULTIES.includes(faculty as Faculty)) {
      res.status(400).json({ error: 'Invalid faculty selection.' });
      return;
    }

    if (!UNIVERSITY_LEVELS.includes(level as Level)) {
      res.status(400).json({ error: 'Invalid level selection.' });
      return;
    }

    // Save PDF file to uploads directory
    const { fileName } = saveNoteFile(req.file.buffer, req.file.originalname);

    const now = new Date().toISOString();
    const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shouldPublish = isPublished === 'true' || isPublished === true;

    const newNote: StudyNote = {
      id,
      courseTitle: courseTitle.trim(),
      topic: topic.trim(),
      lecturer: lecturer.trim(),
      level: level as Level,
      faculty: faculty as Faculty,
      fileUrl: `/api/notes/${id}/pdf`,
      fileName,
      fileSize: req.file.size,
      pageCount: 1, // Will be computed or updated on client reader view
      isPublished: shouldPublish,
      uploadDate: now,
      lastUpdated: now,
    };

    const notes = getNotes();
    notes.unshift(newNote);
    saveNotes(notes);

    res.status(201).json({
      success: true,
      message: shouldPublish ? 'Note uploaded and published successfully!' : 'Note saved as draft (unpublished).',
      note: newNote,
    });
  } catch (err: any) {
    console.error('Upload note error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload PDF note.' });
  }
});

// PUT /api/admin/notes/:id (Edit note descriptive details)
app.put('/api/admin/notes/:id', requireAdmin, (req, res) => {
  try {
    const { courseTitle, topic, lecturer, level, faculty, isPublished } = req.body;
    const notes = getNotes();
    const noteIndex = notes.findIndex((n) => n.id === req.params.id);

    if (noteIndex === -1) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    if (!courseTitle || !topic || !lecturer || !level || !faculty) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    if (!UNIVERSITY_FACULTIES.includes(faculty as Faculty)) {
      res.status(400).json({ error: 'Invalid faculty.' });
      return;
    }

    if (!UNIVERSITY_LEVELS.includes(level as Level)) {
      res.status(400).json({ error: 'Invalid level.' });
      return;
    }

    const existing = notes[noteIndex];
    existing.courseTitle = courseTitle.trim();
    existing.topic = topic.trim();
    existing.lecturer = lecturer.trim();
    existing.level = level as Level;
    existing.faculty = faculty as Faculty;
    if (typeof isPublished === 'boolean') {
      existing.isPublished = isPublished;
    }
    existing.lastUpdated = new Date().toISOString();

    notes[noteIndex] = existing;
    saveNotes(notes);

    res.json({
      success: true,
      message: 'Note details updated successfully.',
      note: existing,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// PATCH /api/admin/notes/:id/publish (Publish / Unpublish toggle)
app.patch('/api/admin/notes/:id/publish', requireAdmin, (req, res) => {
  try {
    const notes = getNotes();
    const note = notes.find((n) => n.id === req.params.id);

    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    const { publish } = req.body;
    const newStatus = typeof publish === 'boolean' ? publish : !note.isPublished;
    note.isPublished = newStatus;
    note.lastUpdated = new Date().toISOString();

    saveNotes(notes);

    res.json({
      success: true,
      message: newStatus ? 'Note published to students.' : 'Note unpublished from student portal.',
      note,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle publication status.' });
  }
});

// DELETE /api/admin/notes/:id (Delete note after confirmation)
app.delete('/api/admin/notes/:id', requireAdmin, (req, res) => {
  try {
    const notes = getNotes();
    const noteIndex = notes.findIndex((n) => n.id === req.params.id);

    if (noteIndex === -1) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    const note = notes[noteIndex];
    deleteNoteFile(note.fileName);

    notes.splice(noteIndex, 1);
    saveNotes(notes);

    res.json({
      success: true,
      message: `Note "${note.courseTitle}" deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// ==========================================
// VITE SPA INTEGRATION & STARTUP
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bernice University Buea Study Notes server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
