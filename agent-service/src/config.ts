import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ override: true });

const EnvSchema = z.object({
  RPC_URL: z.string().url(),
  AGENT_PRIVATE_KEY: z.string().startsWith("0x"),
  VAULT_FACTORY_ADDRESS: z.string().startsWith("0x"),
  AGENT_REGISTRY_ADDRESS: z.string().startsWith("0x"),
  MOCK_POOL_A_ADDRESS: z.string().startsWith("0x"),
  MOCK_POOL_B_ADDRESS: z.string().startsWith("0x"),
  POLL_INTERVAL_SEC: z.string().transform(Number).default("30"),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}
