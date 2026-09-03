import fs from "fs";
import path from "path";
import { cvExists, resolveCvPath, resolveProvider } from "../utils/cvStorage.js";
import localDiskProvider from "../utils/storage/localDiskCvProvider.js";

describe("CV storage abstraction", () => {
  describe("provider selection", () => {
    it("defaults to the local disk provider", () => {
      const provider = resolveProvider();
      expect(provider.name).toBe("local");
    });

    it("resolves the local provider explicitly by name", () => {
      const provider = resolveProvider("local");
      expect(provider).toBe(localDiskProvider);
    });

    it("fails fast (not silently) for an unconfigured provider", () => {
      expect(() => resolveProvider("s3")).toThrow(/Unknown CV_STORAGE_PROVIDER "s3"/);
      expect(() => resolveProvider("gcs")).toThrow(/Available: local/);
    });
  });

  describe("path resolution (path-traversal safety)", () => {
    it("resolves a normal stored reference under the CV root", () => {
      const resolved = resolveCvPath("/uploads/cvs/172-abc.pdf");
      expect(resolved.endsWith(path.join("uploads", "cvs", "172-abc.pdf"))).toBe(true);
    });

    it("strips directory traversal attempts down to a harmless basename", () => {
      const resolved = resolveCvPath("../../../etc/passwd");
      expect(resolved).toBe(path.join(process.cwd(), "uploads", "cvs", "passwd"));
    });
  });

  describe("cvExists", () => {
    const testFilePath = path.join(process.cwd(), "uploads", "cvs", "cvstorage-test-fixture.pdf");

    afterEach(() => {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    });

    it("returns false for a falsy reference", () => {
      expect(cvExists(null)).toBe(false);
      expect(cvExists(undefined)).toBe(false);
      expect(cvExists("")).toBe(false);
    });

    it("returns false when the file doesn't exist on disk", () => {
      expect(cvExists("/uploads/cvs/does-not-exist.pdf")).toBe(false);
    });

    it("returns true once the file is written to the resolved path", () => {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      fs.writeFileSync(testFilePath, "%PDF-1.4 fixture");
      expect(cvExists("/uploads/cvs/cvstorage-test-fixture.pdf")).toBe(true);
    });
  });
});
