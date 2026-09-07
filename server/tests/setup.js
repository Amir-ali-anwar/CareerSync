import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.mock("../utils/sendVerificationEmail.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock("../utils/sendPasswordResetEmail.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// HIBP is a real third-party network call - tests must stay offline and deterministic.
// Individual tests can override this per-call via `.mockResolvedValueOnce(true)`.
jest.mock("../utils/checkPasswordBreached.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(false),
}));

// A real Google ID token can't be verified offline - individual tests override this
// per-call via `.mockResolvedValueOnce({...})` / `.mockRejectedValueOnce(...)`.
jest.mock("../utils/googleAuth.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
