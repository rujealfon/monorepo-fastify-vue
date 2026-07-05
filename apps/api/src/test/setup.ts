import { config } from "dotenv";

// Load .env.test first, override any vars already set by .env
config({ path: ".env.test", override: true });
