import fs from "fs";
import path from "path";
import {
  extractTextFromCv,
  UnsupportedFileTypeError,
  TextExtractionError,
} from "../services/resume/textExtraction.js";

const CV_DIR = path.join(process.cwd(), "uploads", "cvs");

const placeFixture = (fixtureName, destName) => {
  fs.mkdirSync(CV_DIR, { recursive: true });
  const destPath = path.join(CV_DIR, destName);
  fs.copyFileSync(path.join(process.cwd(), "tests", "fixtures", fixtureName), destPath);
  return `/uploads/cvs/${destName}`;
};

describe("Resume text extraction (real pdf-parse integration)", () => {
  const filesToCleanup = [];

  afterEach(() => {
    filesToCleanup.forEach((filePath) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    filesToCleanup.length = 0;
  });

  it("extracts text from a valid PDF", async () => {
    const storedRef = placeFixture("valid-sample.pdf", "extraction-valid.pdf");
    filesToCleanup.push(path.join(CV_DIR, "extraction-valid.pdf"));

    const text = await extractTextFromCv(storedRef);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("throws TextExtractionError for a corrupt/invalid PDF", async () => {
    const storedRef = placeFixture("corrupt-sample.pdf", "extraction-corrupt.pdf");
    filesToCleanup.push(path.join(CV_DIR, "extraction-corrupt.pdf"));

    await expect(extractTextFromCv(storedRef)).rejects.toThrow(TextExtractionError);
  });

  it("throws UnsupportedFileTypeError for a non-PDF extension", async () => {
    await expect(extractTextFromCv("/uploads/cvs/resume.docx")).rejects.toThrow(
      UnsupportedFileTypeError
    );
  });

  it("throws TextExtractionError when the file doesn't exist on disk", async () => {
    await expect(extractTextFromCv("/uploads/cvs/does-not-exist.pdf")).rejects.toThrow(
      TextExtractionError
    );
  });
});
