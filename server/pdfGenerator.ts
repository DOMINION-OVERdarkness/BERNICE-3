/**
 * Generates valid PDF 1.4 documents for educational lecture notes
 * Contains clean text layout, page streams, fonts, and metadata
 */

interface NotePdfOptions {
  university: string;
  faculty: string;
  courseTitle: string;
  topic: string;
  lecturer: string;
  level: string;
  sections: { title: string; paragraphs: string[] }[];
}

export function createLectureNotePdf(options: NotePdfOptions): Buffer {
  const {
    university = "BERNICE UNIVERSITY BUEA, CAMEROON",
    faculty,
    courseTitle,
    topic,
    lecturer,
    level,
    sections,
  } = options;

  // We will build a multi-page PDF document
  // 1 obj = Catalog
  // 2 obj = Outlines
  // 3 obj = Pages
  // 4 obj = Font Helvetica
  // 5 obj = Font Helvetica-Bold
  // For each page:
  // Page obj
  // Content stream obj

  const objects: string[] = [];

  // Helper to add object and get its object number (1-indexed)
  function addObject(content: string): number {
    objects.push(content);
    return objects.length;
  }

  // Pre-allocate first placeholders
  // 1: Catalog -> /Pages 3 0 R
  // 2: Outlines
  // 3: Pages -> /Kids [...] /Count ...
  // 4: Font F1 (Helvetica)
  // 5: Font F2 (Helvetica-Bold)

  // Break sections into pages (approx 1 cover/intro + 2-3 content pages)
  const pagesData: { pageNum: number; lines: { text: string; font: 'F1' | 'F2'; size: number; y: number }[] }[] = [];

  // Page 1: Header + Overview + Section 1
  const page1Lines: { text: string; font: 'F1' | 'F2'; size: number; y: number }[] = [
    { text: university.toUpperCase(), font: 'F2', size: 14, y: 760 },
    { text: faculty.toUpperCase(), font: 'F2', size: 12, y: 740 },
    { text: `ACADEMIC STUDY NOTES - ${level.toUpperCase()}`, font: 'F2', size: 11, y: 720 },
    { text: "--------------------------------------------------------------------------------------------------------", font: 'F1', size: 9, y: 708 },
    { text: `COURSE: ${courseTitle}`, font: 'F2', size: 13, y: 685 },
    { text: `TOPIC: ${topic}`, font: 'F2', size: 12, y: 665 },
    { text: `LECTURER / AUTHOR: ${lecturer}`, font: 'F1', size: 10, y: 645 },
    { text: `ACADEMIC SESSION: 2025/2026 | DEPARTMENT ARCHIVE`, font: 'F1', size: 9, y: 630 },
    { text: "--------------------------------------------------------------------------------------------------------", font: 'F1', size: 9, y: 618 },
  ];

  let currentY = 595;
  let currentPage = 1;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    // Check if we need a new page for this section title
    if (currentY < 180) {
      // Start new page
      currentPage++;
      pagesData.push({
        pageNum: currentPage,
        lines: [
          { text: `${courseTitle} - ${topic}`, font: 'F2', size: 10, y: 760 },
          { text: `${faculty} | ${level} | Page ${currentPage}`, font: 'F1', size: 9, y: 745 },
          { text: "--------------------------------------------------------------------------------------------------------", font: 'F1', size: 9, y: 735 },
        ],
      });
      currentY = 705;
    }

    const currentLines = currentPage === 1 ? page1Lines : pagesData[pagesData.length - 1].lines;
    currentLines.push({ text: `${sIdx + 1}.0 ${section.title}`, font: 'F2', size: 11, y: currentY });
    currentY -= 20;

    for (const para of section.paragraphs) {
      // Wrap paragraph into ~80 character lines
      const words = para.split(" ");
      let currentLine = "";
      for (const word of words) {
        if ((currentLine + " " + word).trim().length > 85) {
          if (currentY < 90) {
            currentPage++;
            pagesData.push({
              pageNum: currentPage,
              lines: [
                { text: `${courseTitle} - ${topic}`, font: 'F2', size: 10, y: 760 },
                { text: `${faculty} | ${level} | Page ${currentPage}`, font: 'F1', size: 9, y: 745 },
                { text: "--------------------------------------------------------------------------------------------------------", font: 'F1', size: 9, y: 735 },
              ],
            });
            currentY = 705;
          }
          const targetLines = currentPage === 1 ? page1Lines : pagesData[pagesData.length - 1].lines;
          targetLines.push({ text: currentLine.trim(), font: 'F1', size: 9.5, y: currentY });
          currentY -= 14;
          currentLine = word;
        } else {
          currentLine += (currentLine ? " " : "") + word;
        }
      }
      if (currentLine.trim()) {
        if (currentY < 90) {
          currentPage++;
          pagesData.push({
            pageNum: currentPage,
            lines: [
              { text: `${courseTitle} - ${topic}`, font: 'F2', size: 10, y: 760 },
              { text: `${faculty} | ${level} | Page ${currentPage}`, font: 'F1', size: 9, y: 745 },
              { text: "--------------------------------------------------------------------------------------------------------", font: 'F1', size: 9, y: 735 },
            ],
          });
          currentY = 705;
        }
        const targetLines = currentPage === 1 ? page1Lines : pagesData[pagesData.length - 1].lines;
        targetLines.push({ text: currentLine.trim(), font: 'F1', size: 9.5, y: currentY });
        currentY -= 14;
      }
      currentY -= 8; // paragraph spacing
    }
    currentY -= 10;
  }

  // Combine page 1 and subsequent pages
  const allPages = [{ pageNum: 1, lines: page1Lines }, ...pagesData];

  // Helper to escape PDF string
  function escapePdf(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  // Create stream content for each page
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  // We have:
  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3: Font F1
  // Obj 4: Font F2
  // Then pairs of (Page, Content)

  const numPages = allPages.length;
  let nextObjId = 5;

  for (let i = 0; i < numPages; i++) {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    pageObjectIds.push(pageObjId);
    contentObjectIds.push(contentObjId);
  }

  // Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // Pages
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>\nendobj`);

  // Font F1 (Helvetica)
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // Font F2 (Helvetica-Bold)
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

  // Build Pages and Contents
  for (let i = 0; i < numPages; i++) {
    const pageObjId = pageObjectIds[i];
    const contentObjId = contentObjectIds[i];
    const pageData = allPages[i];

    // Build text stream
    let streamText = `BT\n`;
    for (const item of pageData.lines) {
      streamText += `/${item.font} ${item.size} Tf\n`;
      streamText += `1 0 0 1 50 ${item.y} Tm\n`;
      streamText += `(${escapePdf(item.text)}) Tj\n`;
    }
    streamText += `ET\n`;

    const streamBytes = Buffer.from(streamText, "utf-8");

    // Page object
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R >>\nendobj`
    );

    // Content object
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamText}endstream\nendobj`
    );
  }

  // Build the complete PDF file with xref table
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const xrefOffsets: number[] = [0];

  for (const obj of objects) {
    xrefOffsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj + "\n";
  }

  const startxref = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offset = xrefOffsets[i].toString().padStart(10, "0");
    pdf += `${offset} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}
