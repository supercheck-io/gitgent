/**
 * Artifact generation tools — Excel, PowerPoint, Word.
 */

import { mkdirSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { displayWorkspacePath, resolveWorkspacePath } from "./safety.js";

/** Maximum artifact file size (25 MB). */
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

/** Check that a written artifact stays within the size cap. */
function assertArtifactSize(filePath: string): void {
  const size = statSync(filePath).size;
  if (size > MAX_ARTIFACT_BYTES) {
    unlinkSync(filePath);
    throw new Error(
      `Artifact exceeds ${MAX_ARTIFACT_BYTES / (1024 * 1024)} MB limit (${(size / (1024 * 1024)).toFixed(1)} MB): ${filePath}`,
    );
  }
}

const ExcelParams = Type.Object({
  path: Type.String({ description: "Output file path (.xlsx)" }),
  sheet_name: Type.Optional(Type.String({ description: "Sheet name" })),
  headers: Type.Array(Type.String(), {
    description: "Column headers",
  }),
  rows: Type.Array(Type.Array(Type.Any()), {
    description: "Data rows (array of arrays)",
  }),
});

const PptxParams = Type.Object({
  path: Type.String({ description: "Output file path (.pptx)" }),
  title: Type.String({ description: "Presentation title" }),
  slides: Type.Array(
    Type.Object({
      title: Type.String(),
      body: Type.String(),
    }),
    { description: "Slide objects with title and body" },
  ),
});

const DocxParams = Type.Object({
  path: Type.String({ description: "Output file path (.docx)" }),
  title: Type.String({ description: "Document title" }),
  sections: Type.Array(
    Type.Object({
      heading: Type.String(),
      body: Type.String(),
    }),
    { description: "Sections with heading and body" },
  ),
});

export const artifactExcelTool: ToolDefinition<typeof ExcelParams> = {
  name: "artifact_excel",
  label: "Generate Excel",
  description: "Generate an Excel (.xlsx) spreadsheet with styled headers.",
  parameters: ExcelParams,
  async execute(_id, args: Static<typeof ExcelParams>) {
    try {
      const outputPath = resolveWorkspacePath(args.path);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const sheet = workbook.addWorksheet(args.sheet_name || "Sheet1");

      // Add headers with styling
      sheet.addRow(args.headers);
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E86C1" },
      };

      // Add data rows
      for (const row of args.rows) {
        sheet.addRow(row);
      }

      // Auto-filter and auto-width
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: args.rows.length + 1, column: args.headers.length },
      };
      for (let i = 1; i <= args.headers.length; i++) {
        const col = sheet.getColumn(i);
        col.width = Math.max(
          args.headers[i - 1].length + 4,
          ...args.rows.map((r) => String(r[i - 1] ?? "").length + 2),
        );
      }

      ensureDir(outputPath);
      await workbook.xlsx.writeFile(outputPath);
      assertArtifactSize(outputPath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Excel saved: ${displayWorkspacePath(outputPath)} (${args.rows.length} rows)`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Excel failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const artifactPptxTool: ToolDefinition<typeof PptxParams> = {
  name: "artifact_pptx",
  label: "Generate PowerPoint",
  description: "Generate a PowerPoint (.pptx) presentation.",
  parameters: PptxParams,
  async execute(_id, args: Static<typeof PptxParams>) {
    try {
      const outputPath = resolveWorkspacePath(args.path);
      const PptxGenJS = await import("pptxgenjs");
      const pptx = new PptxGenJS.default();
      pptx.title = args.title;

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(args.title, {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fontSize: 36, bold: true, align: "center", color: "2E86C1",
      });

      // Content slides
      for (const slide of args.slides) {
        const s = pptx.addSlide();
        s.addText(slide.title, {
          x: 0.5, y: 0.3, w: 9, h: 0.8,
          fontSize: 24, bold: true, color: "2C3E50",
        });
        s.addText(slide.body, {
          x: 0.5, y: 1.3, w: 9, h: 4,
          fontSize: 14, color: "333333", valign: "top",
        });
      }

      ensureDir(outputPath);
      await pptx.writeFile({ fileName: outputPath });
      assertArtifactSize(outputPath);

      return {
        content: [
          {
            type: "text" as const,
            text: `PowerPoint saved: ${displayWorkspacePath(outputPath)} (${args.slides.length + 1} slides)`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `PowerPoint failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const artifactDocxTool: ToolDefinition<typeof DocxParams> = {
  name: "artifact_docx",
  label: "Generate Word Document",
  description: "Generate a Word (.docx) document.",
  parameters: DocxParams,
  async execute(_id, args: Static<typeof DocxParams>) {
    try {
      const outputPath = resolveWorkspacePath(args.path);
      const docx = await import("docx");

      const { Paragraph, HeadingLevel, Document, Packer } = docx;
      const children: InstanceType<typeof Paragraph>[] = [
        new Paragraph({
          text: args.title,
          heading: HeadingLevel.TITLE,
        }),
      ];

      for (const section of args.sections) {
        children.push(
          new Paragraph({
            text: section.heading,
            heading: HeadingLevel.HEADING_1,
          }),
        );
        for (const line of section.body.split("\n")) {
          children.push(new Paragraph({ text: line }));
        }
      }

      const doc = new Document({
        sections: [{ children }],
      });

      ensureDir(outputPath);
      const buffer = await Packer.toBuffer(doc);
      writeFileSync(outputPath, buffer);
      assertArtifactSize(outputPath);

      return {
        content: [
          {
            type: "text" as const,
            text: `Word doc saved: ${displayWorkspacePath(outputPath)} (${args.sections.length} sections)`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Word doc failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};
