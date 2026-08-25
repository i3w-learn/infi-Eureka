import type { AttemptResult, Option } from '../api/tests.api';
import { toPlainText, type ResultAnalysis } from '../lib/resultAnalysis';

/**
 * Builds the downloadable report entirely in the browser and hands it to the
 * browser's own save-file flow. Nothing is uploaded or stored on our side —
 * the student's device keeps the file, and clicking again rebuilds it from
 * the same result data.
 *
 * jspdf is loaded on demand so the ~100KB library is fetched only when a
 * student actually asks for the PDF, not on every results page.
 *
 * Text is flattened with toPlainText: the built-in PDF fonts cover Latin
 * only, so formulas appear as their TeX source and diagrams as "[diagram]".
 */
const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

const PAGE = { width: 210, height: 297, margin: 16 } as const;
const LINE = 5.2;

const INK = '#241033';
const SOFT = '#5b4a68';
const FAINT = '#8d7f97';
const SUCCESS = '#1e7a4d';
const DANGER = '#b3261e';
const PLUM = '#4c2a5e';
const EDGE = '#e4d6bd';

interface ReportInput {
  result: AttemptResult;
  analysis: ResultAnalysis;
  testTitle: string;
}

export async function downloadResultPdf({ result, analysis, testTitle }: ReportInput): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentWidth = PAGE.width - PAGE.margin * 2;
  let y = PAGE.margin;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE.height - PAGE.margin) {
      doc.addPage();
      y = PAGE.margin;
    }
  };

  const text = (value: string, opts: { size?: number; bold?: boolean; color?: string; x?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(opts.color ?? INK);
    doc.text(value, opts.x ?? PAGE.margin, y);
  };

  const paragraph = (
    value: string,
    opts: { size?: number; bold?: boolean; color?: string; indent?: number } = {},
  ) => {
    const indent = opts.indent ?? 0;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(opts.color ?? INK);
    const lines = doc.splitTextToSize(value, contentWidth - indent) as string[];
    for (const line of lines) {
      ensureRoom(LINE);
      doc.text(line, PAGE.margin + indent, y);
      y += LINE;
    }
  };

  /* ---- Header ---- */
  text('infi-Eureka · Mock test report', { size: 9, color: FAINT });
  y += 8;
  text(testTitle, { size: 18, bold: true, color: PLUM });
  y += 6;
  text(`Submitted ${formatDate(result.submittedAt)}`, { size: 9, color: SOFT });
  y += 10;

  /* ---- Score ---- */
  const percentage = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0;
  doc.setFillColor(PLUM);
  doc.roundedRect(PAGE.margin, y, contentWidth, 26, 3, 3, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${result.score} / ${result.totalMarks}`, PAGE.margin + 8, y + 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${percentage}% of total marks`, PAGE.margin + 8, y + 20);
  const tiles = [
    ['Correct', result.correctCount],
    ['Wrong', result.wrongCount],
    ['Skipped', result.unattemptedCount],
  ] as const;
  tiles.forEach(([label, value], i) => {
    const x = PAGE.margin + contentWidth - 24 * (3 - i);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), x, y + 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, y + 19);
  });
  y += 36;

  /* ---- Subject breakdown ---- */
  text('Subject-wise performance', { size: 13, bold: true });
  y += 4;
  if (analysis.weakest && analysis.strongest) {
    text(
      `Weakest: ${analysis.weakest.subject} (${analysis.weakest.accuracy}% accuracy)   ·   Strongest: ${analysis.strongest.subject} (${analysis.strongest.accuracy}%)`,
      { size: 9, color: SOFT },
    );
    y += 4;
  }
  y += 3;

  const cols = [
    { label: 'Subject', width: 56 },
    { label: 'Correct', width: 22 },
    { label: 'Wrong', width: 22 },
    { label: 'Skipped', width: 22 },
    { label: 'Marks', width: 28 },
    { label: 'Accuracy', width: 28 },
  ];
  const rowHeight = 7;
  const drawRow = (cells: string[], opts: { header?: boolean; accuracy?: number } = {}) => {
    ensureRoom(rowHeight);
    let x = PAGE.margin;
    doc.setFont('helvetica', opts.header ? 'bold' : 'normal');
    doc.setFontSize(9);
    cells.forEach((cell, i) => {
      const col = cols[i];
      if (!col) return;
      const isAccuracy = i === cols.length - 1 && !opts.header && opts.accuracy !== undefined;
      doc.setTextColor(
        opts.header
          ? FAINT
          : isAccuracy
            ? opts.accuracy! >= 70
              ? SUCCESS
              : opts.accuracy! < 40
                ? DANGER
                : INK
            : INK,
      );
      doc.text(cell, x + 2, y + 5);
      x += col.width;
    });
    doc.setDrawColor(EDGE);
    doc.line(PAGE.margin, y + rowHeight, PAGE.margin + contentWidth, y + rowHeight);
    y += rowHeight;
  };
  drawRow(
    cols.map((c) => c.label),
    { header: true },
  );
  for (const s of analysis.subjects) {
    drawRow(
      [
        s.subject,
        String(s.correct),
        String(s.wrong),
        String(s.skipped),
        `${s.scored} / ${s.possible}`,
        `${s.accuracy}%`,
      ],
      { accuracy: s.accuracy },
    );
  }
  y += 10;

  /* ---- Question review ---- */
  ensureRoom(20);
  text('Question-by-question review', { size: 13, bold: true });
  y += 8;

  const questions = result.questions.slice().sort((a, b) => a.position - b.position);
  for (const q of questions) {
    const outcome =
      q.outcome === 'correct' ? `+${q.marks}` : q.outcome === 'wrong' ? `-${q.negativeMarks}` : 'Skipped';
    const outcomeColor = q.outcome === 'correct' ? SUCCESS : q.outcome === 'wrong' ? DANGER : FAINT;

    ensureRoom(LINE * 3);
    const heading = `${q.position}.${q.subject ? `  ${q.subject}` : ''}`;
    text(heading, { size: 8, color: FAINT });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(outcomeColor);
    doc.text(outcome, PAGE.margin + contentWidth, y, { align: 'right' });
    y += LINE;

    paragraph(toPlainText(q.questionText), { size: 10 });
    y += 1;

    for (const option of OPTIONS) {
      const isCorrect = q.correctOption === option;
      const isChosen = q.chosenOption === option;
      const marker = isCorrect ? '  (correct)' : isChosen ? '  (your answer)' : '';
      paragraph(`${option}.  ${toPlainText(q.options[option])}${marker}`, {
        size: 9,
        bold: isCorrect || isChosen,
        color: isCorrect ? SUCCESS : isChosen ? DANGER : SOFT,
        indent: 4,
      });
    }
    y += 4;
  }

  /* ---- Footer on every page ---- */
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(FAINT);
    doc.text(`Page ${page} of ${pageCount}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
  }

  doc.save(`${slug(testTitle)}-report-${result.submittedAt.slice(0, 10)}.pdf`);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function slug(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'mock-test';
}
