import dotenv from "dotenv";
import path from 'path';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set longer timeout for tests
jest.setTimeout(120000);
