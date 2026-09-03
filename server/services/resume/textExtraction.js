import path from "path";
import { readCvBuffer } from "../../utils/cvStorage.js";
// pdf-parse's package entry point (index.js) checks `module.parent` to decide whether to
// run its own internal debug/demo code, which reads a bundled test fixture from a
// relative path and crashes if that path doesn't resolve from the current working
// directory. That check is only ever true when loaded as a real top-level CJS require;
// importing the package entry point via ESM leaves `module.parent` unset and incorrectly
// triggers the debug path (confirmed directly against pdf-parse@1.1.1 in this project -
// also breaks under Jest's Babel-to-CJS transform, which chokes on `import.meta`, the
// usual workaround). Importing its inner implementation file directly skips index.js
// (and its debug check) entirely, using a plain, ordinary ESM import.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

class UnsupportedFileTypeError extends Error {
  constructor(extension) {
    super(`Resume text extraction does not support "${extension}" files yet`);
    this.name = "UnsupportedFileTypeError";
  }
}

class TextExtractionError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "TextExtractionError";
    this.cause = cause;
  }
}

// Only PDF is implemented. The upload validator (middlewares/fileuploader.js) also
// allows .doc/.docx - those are a known, documented gap (would need a separate parser,
// e.g. mammoth for .docx; legacy .doc has no good pure-JS option) rather than a silent
// failure: extractTextFromCv rejects them with a distinguishable UnsupportedFileTypeError
// so callers can record a clear "why" instead of guessing.
const SUPPORTED_EXTENSIONS = new Set([".pdf"]);

const extractTextFromCv = async (storedCvPath) => {
  const extension = path.extname(storedCvPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new UnsupportedFileTypeError(extension);
  }

  try {
    const buffer = await readCvBuffer(storedCvPath);
    const { text } = await pdfParse(buffer);
    return text.trim();
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError) throw error;
    throw new TextExtractionError(`Failed to extract text from CV: ${error.message}`, error);
  }
};

export { extractTextFromCv, UnsupportedFileTypeError, TextExtractionError };
