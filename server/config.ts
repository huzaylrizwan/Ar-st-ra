import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  STORAGE_PROVIDER: z.enum(["replit", "local"]).default("local"),
  REPLIT_AUTH_ENABLED: z.string().transform(v => v === "true").default("false"),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

function parseConfig() {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors.map(e => `  ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`\n❌ Invalid environment configuration:\n${errors}\n`);
  }
  return result.data;
}

export const config = parseConfig();
