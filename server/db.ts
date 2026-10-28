import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createLectureNotePdf } from './pdfGenerator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

export const UNIVERSITY_FACULTIES = [
  'Faculty of Engineering and Technology',
  'Faculty of Health and Biomedical Science',
  'Faculty of Agriculture',
  'Faculty of Business and Management Sciences',
  'Faculty of Education',
  'Faculty of Home Economics and Social Works',
] as const;

export const UNIVERSITY_LEVELS = [
  'Level 100',
  'Level 200',
  'Level 300',
] as const;

export type Faculty = typeof UNIVERSITY_FACULTIES[number];
export type Level = typeof UNIVERSITY_LEVELS[number];

export interface StudyNote {
  id: string;
  courseTitle: string;
  topic: string;
  lecturer: string;
  level: Level;
  faculty: Faculty;
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  pageCount: number;
  isPublished: boolean;
  uploadDate: string; // ISO
  lastUpdated: string; // ISO
  ocrText?: string;
}

export interface AdminConfig {
  passwordHash: string;
  salt: string;
  updatedAt: string;
  resetPhrase: string; // e.g. "BUB-SECRET-RECOVERY-KEY"
}

// Token secret for signing session tokens
const TOKEN_SECRET = process.env.SESSION_SECRET || 'bub-portal-secure-secret-2026-key';

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Password hashing with PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Admin Session Token (HMAC-SHA256)
export function createAdminToken(): string {
  const payload = {
    role: 'admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    random: crypto.randomBytes(8).toString('hex'),
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadStr).digest('base64url');
  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.role !== 'admin') return false;
    if (payload.expiresAt < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// Admin credential storage
export function getAdminConfig(): AdminConfig {
  ensureDirectories();
  if (!fs.existsSync(ADMIN_FILE)) {
    // Default initial password is 12345678 as specified in prompt
    const { hash, salt } = hashPassword('12345678');
    const defaultConfig: AdminConfig = {
      passwordHash: hash,
      salt: salt,
      updatedAt: new Date().toISOString(),
      resetPhrase: 'BUB-SECRET-RECOVERY-KEY',
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    return defaultConfig;
  }
  const data = fs.readFileSync(ADMIN_FILE, 'utf-8');
  return JSON.parse(data);
}

export function updateAdminPassword(newPassword: string): void {
  ensureDirectories();
  const config = getAdminConfig();
  const { hash, salt } = hashPassword(newPassword);
  config.passwordHash = hash;
  config.salt = salt;
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function resetAdminPassword(): void {
  // Resets password to original default 12345678
  updateAdminPassword('12345678');
}

// Notes storage
export function getNotes(): StudyNote[] {
  ensureDirectories();
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, '[]', 'utf-8');
    return [];
  }
  try {
    const data = fs.readFileSync(NOTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading notes.json:', err);
    return [];
  }
}

export function saveNotes(notes: StudyNote[]): void {
  ensureDirectories();
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

export function getNoteById(id: string): StudyNote | undefined {
  const notes = getNotes();
  return notes.find((n) => n.id === id);
}

export function saveNoteFile(buffer: Buffer, originalFilename: string): { fileName: string; filePath: string } {
  ensureDirectories();
  const ext = path.extname(originalFilename) || '.pdf';
  const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${safeBase}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, uniqueName);
  fs.writeFileSync(targetPath, buffer);
  return { fileName: uniqueName, filePath: targetPath };
}

export function deleteNoteFile(fileName: string): void {
  try {
    const targetPath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch (err) {
    console.error('Failed to delete note file:', err);
  }
}

export function getNoteFilePath(fileName: string): string {
  return path.join(UPLOADS_DIR, fileName);
}

// Seed authentic Bernice University Buea notes across levels & faculties
export function seedInitialNotes(): StudyNote[] {
  ensureDirectories();
  const initialData: Array<{
    courseTitle: string;
    topic: string;
    lecturer: string;
    level: Level;
    faculty: Faculty;
    sections: { title: string; paragraphs: string[] }[];
  }> = [
    {
      courseTitle: 'ENG 101: Engineering Mathematics & Vector Calculus',
      topic: 'Vectors, Matrices, and Systems of Linear Differential Equations',
      lecturer: 'Engr. Prof. K. O. Egharevba',
      level: 'Level 100',
      faculty: 'Faculty of Engineering and Technology',
      sections: [
        {
          title: 'Introduction to Engineering Vectors in 3D Space',
          paragraphs: [
            'Vectors are fundamental mathematical entities possessing both magnitude and directional orientation. In civil, mechanical, and electrical engineering, vectors model mechanical forces, fluid velocity vectors, electromagnetic field gradients, and acceleration tensors across three-dimensional Euclidean coordinates.',
            'Vector dot products quantify directional projections and work done by forces, whereas vector cross products govern mechanical torques, angular momentum, and magnetic Lorentz forces acting on charge carriers.',
          ],
        },
        {
          title: 'Matrix Eigenvalues and State Transformations',
          paragraphs: [
            'A square matrix transformation reveals characteristic roots termed eigenvalues. Solving the characteristic equation det(A - lambda * I) = 0 yields the fundamental vibrational modes in structural trusses and stability envelopes of dynamical systems.',
            'In automated control loops, negative real parts of eigenvalues guarantee asymptotic decay of perturbations, ensuring safe engineering operations under external stresses.',
          ],
        },
        {
          title: 'Practice Problems and Tutorial Assignment',
          paragraphs: [
            'Evaluate the divergence and curl of vector field F(x,y,z) = (2xy)i + (x^2 + z)j + (y^2)k over the cylindrical volume of radius 4 meters. Submit solutions to the Faculty of Engineering Departmental Box by Friday noon.',
          ],
        },
      ],
    },
    {
      courseTitle: 'CPE 201: Digital Logic & Computer Organization',
      topic: 'Boolean Algebra, Logic Gates, and Combinational Circuit Optimization',
      lecturer: 'Dr. (Mrs.) A. N. Osagie',
      level: 'Level 200',
      faculty: 'Faculty of Engineering and Technology',
      sections: [
        {
          title: 'Fundamental Axioms of Boolean Algebra',
          paragraphs: [
            'George Boole formulated the mathematical foundations governing binary digital states (0 and 1). Fundamental axioms include commutativity, associativity, distributivity, identity elements, and complementation.',
            "De Morgan's laws state that the complement of a logical conjunction is identical to the disjunction of the complements: not(A and B) = not A or not B. These theorems enable circuit designers to synthesize any arbitrary logic expression solely with universal NAND or NOR gates.",
          ],
        },
        {
          title: 'Karnaugh Map (K-Map) Circuit Minimization',
          paragraphs: [
            'Karnaugh maps organize truth table minterms into gray-code geometric adjacent cells. By grouping power-of-two adjacent ones (rectangles of 1, 2, 4, 8, or 16), redundant algebraic terms are canceled, minimizing silicon gate delay and dynamic power dissipation.',
            'Hazards in combinational circuits—specifically static-1 and static-0 glitches—occur due to unequal propagation delays across parallel paths. Adding redundant prime implicants eliminates transition hazards during high-frequency clock cycles.',
          ],
        },
        {
          title: 'Laboratory Experiment: 4-Bit Arithmetic Logic Unit (ALU)',
          paragraphs: [
            'Students will construct a 4-bit parallel adder using 74LS83 integrated circuits, integrating carry look-ahead logic to achieve sub-nanosecond propagation delays. Prepare breadboard schematics prior to Friday 9:00 AM practical class in Laboratory 3B.',
          ],
        },
      ],
    },
    {
      courseTitle: 'EEE 301: Electric Power Systems Analysis',
      topic: 'Three-Phase Balanced Systems, Symmetrical Faults, and Grid Stability',
      lecturer: 'Engr. Dr. F. I. Omoruyi',
      level: 'Level 300',
      faculty: 'Faculty of Engineering and Technology',
      sections: [
        {
          title: 'Principles of Three-Phase Generation and Distribution',
          paragraphs: [
            'Polyphase alternating current generation produces three sinusoidal voltages displaced mutually by 120 electrical degrees. Balanced star-connected systems offer line-to-line voltages equal to square-root of 3 times phase voltage, delivering constant instantaneous power with zero neutral return current.',
            'Per-unit normalization simplifies multi-voltage transmission grids by expressing actual voltages, currents, and impedances as dimensionless ratios relative to system base quantities.',
          ],
        },
        {
          title: 'Symmetrical Short-Circuit Fault Calculations',
          paragraphs: [
            'Subtransient, transient, and steady-state reactances govern generator behavior immediately following a symmetrical three-phase fault. Subtransient reactance Xd double-prime determines circuit breaker interrupting capacity and relay pickup thresholds.',
          ],
        },
      ],
    },
    {
      courseTitle: 'ANA 101: Human Gross Anatomy & Osteology',
      topic: 'Skeletal Framework, Axial Skeleton, and Musculoskeletal Biomechanics',
      lecturer: 'Prof. (Dr.) E. U. Akhigbe',
      level: 'Level 100',
      faculty: 'Faculty of Health and Biomedical Science',
      sections: [
        {
          title: 'Osteological Architecture of the Human Skeleton',
          paragraphs: [
            'The adult human skeleton comprises 206 distinct bones organized into the axial skeleton (skull, vertebral column, thoracic cage) and appendicular skeleton (pectoral girdle, upper limbs, pelvic girdle, lower limbs). Bones perform metabolic calcium homeostasis, hematopoiesis inside bone marrow, and mechanical support.',
            'Cortical bone imparts compressive strength via tightly packed cylindrical osteons, whereas trabecular cancellous bone absorbs kinetic shock along structural stress trajectories.',
          ],
        },
        {
          title: 'Vertebral Column and Spinal Curvatures',
          paragraphs: [
            'Thirty-three vertebrae form cervical, thoracic, lumbar, sacral, and coccygeal sections. Primary thoracic and sacral kyphoses accommodate viscera, whereas secondary cervical and lumbar lordoses develop as infants attain head support and bipedal locomotion.',
          ],
        },
      ],
    },
    {
      courseTitle: 'PHM 201: Principles of Pharmacology & Pharmacokinetics',
      topic: 'Drug Absorption, Distribution, Metabolism, and Excretion (ADME)',
      lecturer: 'Dr. V. O. Imasuen',
      level: 'Level 200',
      faculty: 'Faculty of Health and Biomedical Science',
      sections: [
        {
          title: 'Pharmacokinetic Pathways and Membrane Permeability',
          paragraphs: [
            'Pharmacokinetics describes how the biological organism acts upon an administered therapeutic compound. The ADME framework evaluates drug bioavailability through passive diffusion, carrier-mediated transport, and pinocytosis across biological lipid bilayers.',
            'Weak organic acids and bases ionize according to the Henderson-Hasselbalch equation, dictating gastric vs intestinal absorption and tubular reabsorption in the renal nephrons.',
          ],
        },
        {
          title: 'Hepatic Cytochrome P450 Biotransformation',
          paragraphs: [
            'Phase I functionalization reactions catalyzed by microsomal CYP450 isoenzymes introduce polar hydroxyl or amine groups. Phase II conjugation reactions attach endogenous hydrophilic moieties such as glucuronic acid or glutathione, promoting biliary or urinary excretion.',
          ],
        },
      ],
    },
    {
      courseTitle: 'MLS 301: Clinical Biochemistry & Enzymology',
      topic: 'Diagnostic Serum Enzyme Markers, Isoenzymes, and Metabolic Disorders',
      lecturer: 'Dr. C. I. Omozokpia',
      level: 'Level 300',
      faculty: 'Faculty of Health and Biomedical Science',
      sections: [
        {
          title: 'Diagnostic Enzymology in Clinical Pathology',
          paragraphs: [
            'Serum enzymes serve as sensitive clinical biomarkers of cellular necrosis. Transaminases (AST and ALT) differentiate hepatocellular damage from extrahepatic obstructive jaundice. Alanine aminotransferase exhibits high liver specificity, whereas aspartate aminotransferase is also elevated following acute myocardial infarction.',
          ],
        },
      ],
    },
    {
      courseTitle: 'AGR 101: Introduction to Agricultural Science & Botany',
      topic: 'Soil Composition, Plant Nutrition, and Tropical Crop Agronomy',
      lecturer: 'Prof. S. O. Igbinomwanhia',
      level: 'Level 100',
      faculty: 'Faculty of Agriculture',
      sections: [
        {
          title: 'Physical and Chemical Properties of Tropical Soils',
          paragraphs: [
            'Tropical soils across the Nigerian rainforest belt are predominantly alfisols and ultisols characterized by kaolinite clay mineralogy and moderate cation exchange capacity. Soil organic matter is critical for moisture retention, soil aggregate structure, and phosphorus availability.',
            'Macronutrients (nitrogen, phosphorus, potassium, calcium, magnesium, sulfur) alongside trace micronutrients regulate enzymatic synthesis and photosynthetic carbon assimilation in cereal and tuber crops.',
          ],
        },
      ],
    },
    {
      courseTitle: 'AGR 202: Animal Husbandry & Livestock Nutrition',
      topic: 'Ruminant Digestion, Forage Conservation, and Poultry Management',
      lecturer: 'Dr. P. A. Obasohan',
      level: 'Level 200',
      faculty: 'Faculty of Agriculture',
      sections: [
        {
          title: 'Physiological Ruminant Fermentation',
          paragraphs: [
            'The polygastric digestive tract of cattle, sheep, and goats incorporates the rumen, reticulum, omasum, and abomasum. Symbiotic anaerobic bacteria, protozoa, and fungi hydrolyze structural plant cellulose and hemicellulose into volatile fatty acids (acetate, propionate, butyrate).',
          ],
        },
      ],
    },
    {
      courseTitle: 'AGR 305: Agricultural Economics & Farm Management',
      topic: 'Production Economics, Linear Programming, and Agribusiness Supply Chains',
      lecturer: 'Prof. M. U. Eweka',
      level: 'Level 300',
      faculty: 'Faculty of Agriculture',
      sections: [
        {
          title: 'Production Function and Diminishing Marginal Returns',
          paragraphs: [
            'The classical production function illustrates relationships between variable inputs (fertilizer, labor, mechanized tractor hours) and total crop harvest. The law of diminishing marginal returns dictates that beyond rational Stage II, marginal physical product declines.',
          ],
        },
      ],
    },
    {
      courseTitle: 'ACC 101: Principles of Financial Accounting I',
      topic: 'Double Entry Bookkeeping, Trial Balance, and Financial Statements',
      lecturer: 'Dr. G. O. Edobor',
      level: 'Level 100',
      faculty: 'Faculty of Business and Management Sciences',
      sections: [
        {
          title: 'Fundamental Accounting Equation and Double Entry Rules',
          paragraphs: [
            'The cardinal accounting equation states: Assets = Liabilities + Capital (Equity). Every economic transaction exerts a dual aspect: for every debit entry, there must be a corresponding credit entry of equal magnitude.',
            'Debits increase assets and expenses while decreasing liabilities, equity, and revenues. Credits increase liabilities, equity, and revenues while decreasing assets and expenses.',
          ],
        },
        {
          title: 'Preparation of Statement of Comprehensive Income',
          paragraphs: [
            'The statement of profit or loss matches revenues generated during an accounting period against expenses incurred to generate them, fulfilling the accruals and matching principles under International Financial Reporting Standards (IFRS).',
          ],
        },
      ],
    },
    {
      courseTitle: 'BUS 201: Organizational Behaviour & Management Theory',
      topic: 'Motivational Theories, Leadership Paradigms, and Corporate Culture',
      lecturer: 'Prof. (Mrs.) J. E. Izevbigie',
      level: 'Level 200',
      faculty: 'Faculty of Business and Management Sciences',
      sections: [
        {
          title: 'Classical vs Contemporary Motivational Models',
          paragraphs: [
            "Abraham Maslow's hierarchy of needs classifies human drives from physiological and safety needs to social belonging, esteem, and self-actualization. Frederick Herzberg's two-factor theory differentiates hygiene factors (salary, working conditions) from intrinsic motivators (recognition, responsibility).",
          ],
        },
      ],
    },
    {
      courseTitle: 'FIN 301: Corporate Finance & Investment Portfolio Analysis',
      topic: 'Capital Asset Pricing Model (CAPM), WACC, and Capital Budgeting',
      lecturer: 'Dr. E. O. Uwadia',
      level: 'Level 300',
      faculty: 'Faculty of Business and Management Sciences',
      sections: [
        {
          title: 'Capital Budgeting: Net Present Value vs Internal Rate of Return',
          paragraphs: [
            'Net Present Value (NPV) discounts anticipated future cash flows at the enterprise Weighted Average Cost of Capital (WACC). An investment yielding NPV > 0 expands shareholder net worth. NPV is theoretically superior to IRR in mutually exclusive investments with non-normal cash flows.',
          ],
        },
      ],
    },
    {
      courseTitle: 'EDU 101: Foundations of Education & Philosophy',
      topic: 'Philosophical Schools of Thought and Evolution of Nigerian Education',
      lecturer: 'Prof. T. O. Owie',
      level: 'Level 100',
      faculty: 'Faculty of Education',
      sections: [
        {
          title: 'Philosophical Currents in Pedagogical Practice',
          paragraphs: [
            'Idealism, Realism, Pragmatism, and Existentialism provide distinct perspectives on human knowledge, reality, and curriculum development. Pragmatic educational theory, advocated by John Dewey, centers experiential learning, problem-solving inquiry, and collaborative classroom environments.',
          ],
        },
      ],
    },
    {
      courseTitle: 'EDU 202: Educational Psychology & Child Development',
      topic: 'Cognitive Stages of Piaget, Vygotsky Social Development, and Behaviorism',
      lecturer: 'Dr. (Mrs.) H. I. Enoma',
      level: 'Level 200',
      faculty: 'Faculty of Education',
      sections: [
        {
          title: "Piaget's Stages of Intellectual Development",
          paragraphs: [
            "Jean Piaget identified four developmental milestones: Sensorimotor (0-2 years), Preoperational (2-7 years), Concrete Operational (7-11 years), and Formal Operational (11+ years). Learners construct internal cognitive schemata through assimilation and accommodation.",
          ],
        },
      ],
    },
    {
      courseTitle: 'EDU 303: Curriculum Design & Instructional Technology',
      topic: 'Curriculum Implementation, Bloom Revised Taxonomy, and Digital Classrooms',
      lecturer: 'Dr. P. N. Agbonlahor',
      level: 'Level 300',
      faculty: 'Faculty of Education',
      sections: [
        {
          title: 'Taxonomy of Educational Objectives in Lesson Design',
          paragraphs: [
            "Benjamin Bloom's revised cognitive taxonomy structures cognitive mastery across six hierarchical tiers: Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating. Instructional design aligns behavioral objectives directly with summative rubrics.",
          ],
        },
      ],
    },
    {
      courseTitle: 'HES 101: Fundamentals of Food Science & Nutrition',
      topic: 'Nutrient Bioavailability, Meal Planning, and Food Preservation Techniques',
      lecturer: 'Dr. (Mrs.) R. O. Okojie',
      level: 'Level 100',
      faculty: 'Faculty of Home Economics and Social Works',
      sections: [
        {
          title: 'Nutritional Biochemistry and Dietary Balance',
          paragraphs: [
            'Essential nutrients encompass carbohydrates, lipids, amino acids, vitamins, minerals, and dietary water. Balanced meal planning ensures appropriate caloric density while avoiding micro-deficiencies such as anemia and hypovitaminosis.',
          ],
        },
      ],
    },
    {
      courseTitle: 'HES 203: Textiles, Fabric Construction & Apparel Design',
      topic: 'Natural and Synthetic Fibers, Weaving Mechanisms, and Quality Testing',
      lecturer: 'Mrs. B. E. Omorodion',
      level: 'Level 200',
      faculty: 'Faculty of Home Economics and Social Works',
      sections: [
        {
          title: 'Classification of Textile Fibers and Polymer Morphology',
          paragraphs: [
            'Fibers are categorized into natural plant cellulosics (cotton, linen), animal protein fibers (wool, silk), regenerated rayons, and synthetic polymers (polyester, nylon). Fiber strength, dye affinity, and elongation dictate suitable industrial applications.',
          ],
        },
      ],
    },
    {
      courseTitle: 'SCW 301: Community Social Work & Vulnerable Populations',
      topic: 'Social Welfare Policy, Child Protection Systems, and Case Interventions',
      lecturer: 'Dr. K. E. Idehen',
      level: 'Level 300',
      faculty: 'Faculty of Home Economics and Social Works',
      sections: [
        {
          title: 'Principles of Ecological Systems in Social Work Practice',
          paragraphs: [
            "Urie Bronfenbrenner's ecological systems theory conceptualizes individual development across nested micro-, meso-, exo-, macro-, and chrono-systems. Community case workers intervene at systemic intersection points to empower disenfranchised households and strengthen family stability.",
          ],
        },
      ],
    },
  ];

  const seededNotes: StudyNote[] = [];

  for (let i = 0; i < initialData.length; i++) {
    const item = initialData[i];
    const pdfBuffer = createLectureNotePdf({
      university: 'Bernice University Buea, Cameroon',
      faculty: item.faculty,
      courseTitle: item.courseTitle,
      topic: item.topic,
      lecturer: item.lecturer,
      level: item.level,
      sections: item.sections,
    });

    const safeCourse = item.courseTitle.split(':')[0].trim().replace(/\s+/g, '_');
    const fileName = `BUB_${safeCourse}_${item.level.replace(/\s+/g, '')}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    // Calculate pages (approx 2-3 pages)
    const pageCount = item.sections.length >= 2 ? 3 : 2;

    const id = `bub_note_${i + 1}`;
    const uploadDate = new Date(Date.now() - (initialData.length - i) * 86400000).toISOString();

    seededNotes.push({
      id,
      courseTitle: item.courseTitle,
      topic: item.topic,
      lecturer: item.lecturer,
      level: item.level,
      faculty: item.faculty,
      fileUrl: `/api/notes/${id}/pdf`,
      fileName,
      fileSize: pdfBuffer.length,
      pageCount,
      isPublished: true, // All seed notes published by default for rich student browsing
      uploadDate,
      lastUpdated: uploadDate,
    });
  }

  // Also create a sample unpublished draft note for admin demonstration
  const draftPdf = createLectureNotePdf({
    university: 'Bernice University Buea, Cameroon',
    faculty: 'Faculty of Engineering and Technology',
    courseTitle: 'ENG 202: Fluid Mechanics & Thermodynamics (Draft)',
    topic: 'Bernoulli Equation and Viscous Fluid Dynamics in Conduit Pipes',
    lecturer: 'Engr. Dr. S. U. Osamwonyi',
    level: 'Level 200',
    sections: [
      {
        title: 'Draft Chapter: Continuity and Energy Equations',
        paragraphs: [
          'This note is currently in review by the Faculty of Engineering Curriculum Board and is set to unpublished status for lecturer revision.',
        ],
      },
    ],
  });
  const draftFileName = 'BUB_ENG202_DRAFT.pdf';
  fs.writeFileSync(path.join(UPLOADS_DIR, draftFileName), draftPdf);
  seededNotes.push({
    id: `bub_note_draft_1`,
    courseTitle: 'ENG 202: Fluid Mechanics & Thermodynamics (Draft)',
    topic: 'Bernoulli Equation and Viscous Fluid Dynamics in Conduit Pipes',
    lecturer: 'Engr. Dr. S. U. Osamwonyi',
    level: 'Level 200',
    faculty: 'Faculty of Engineering and Technology',
    fileUrl: `/api/notes/bub_note_draft_1/pdf`,
    fileName: draftFileName,
    fileSize: draftPdf.length,
    pageCount: 2,
    isPublished: false, // Unpublished draft
    uploadDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });

  saveNotes(seededNotes);
  getAdminConfig(); // Ensures admin file exists
  return seededNotes;
}
