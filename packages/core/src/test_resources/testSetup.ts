import dotenv from "dotenv";
import { jest } from "@jest/globals";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set longer timeout for tests
jest.setTimeout(120000);
