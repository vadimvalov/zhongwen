import "reflect-metadata";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { BaseService } from "./BaseService";
import { ConfigValue, ConfigMetadataRegistry } from "./decorators";

/**
 * Example of an OOP-based configuration system using Reflection.
 */
class ConfigService extends BaseService {
  @ConfigValue("APP_PORT")
  public port: number = 3000;

  @ConfigValue("API_KEY")
  public apiKey: string = "default-key";
}

export class ReflectionRunner {
  public static async scanAndRun() {
    const libDir = new URL(".", import.meta.url).pathname;
    const files = readdirSync(libDir);

    console.log(`--- [1] Scanning directory: ${libDir} ---`);

    for (const file of files) {
      if (file.endsWith(".ts") && !["runner.ts", "BaseService.ts", "decorators.ts"].includes(file)) {
        const modulePath = join(libDir, file);
        const module = await import(modulePath);

        for (const key in module) {
          const Exported = module[key];
          if (typeof Exported === "function" && Exported.prototype instanceof BaseService) {
            await this.runOnClass(Exported);
          }
        }
      }
    }

    console.log(`\n--- [2] Dynamic Configuration Demo ---`);
    await this.demoConfig();
  }

  private static async demoConfig() {
    const config = new ConfigService();
    // Simulate environment variables
    const mockEnv: Record<string, string> = {
      APP_PORT: "8080",
      API_KEY: "secret-reflection-key",
    };

    console.log("Original Config:", { port: config.port, apiKey: config.apiKey });
    console.log("Mock Environment:", mockEnv);

    // Use reflection to populate the config
    const keys = Object.getOwnPropertyNames(config);
    for (const key of keys) {
      // Retrieve metadata from our Registry using the field name
      const envKey = Reflect.getMetadata("config:env", ConfigMetadataRegistry, key);
      if (envKey && mockEnv[envKey]) {
        console.log(`[Reflection] Mapping ${envKey} -> field ${key}`);
        (config as any)[key] = mockEnv[envKey];
      }
    }

    console.log("Updated Config (via Reflection):", { port: config.port, apiKey: config.apiKey });
  }

  private static async runOnClass(Cls: any) {
    console.log(`\nAnalyzing Service Class: ${Cls.name}`);
    const instance = new Cls();
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (prop) => prop !== "constructor" && typeof prototype[prop] === "function"
    );

    for (const methodName of methodNames) {
      const method = prototype[methodName];
      const hskMeta = Reflect.getMetadata("validate:hsk", method);

      if (hskMeta) {
        console.log(`[Reflection] Found @ValidateHSK on ${methodName}: min=${hskMeta.min}, max=${hskMeta.max}`);

        // 1. SUCCESS
        console.log(`[Reflection] Test 1: Calling ${methodName} with VALID HSK level (1)...`);
        try {
          const result = Reflect.apply(method, instance, [{ challengeId: "valid-run", hskLevel: 1, questionCount: 1 }]) as any;
          console.log(`[Result] Success! Questions generated: ${result?.length ?? 0}`);
        } catch (err: any) {
          console.error(`[Error] Unexpected failure: ${err.message}`);
        }

        // 2. FAILURE
        console.log(`[Reflection] Test 2: Calling ${methodName} with INVALID HSK level (99)...`);
        try {
          Reflect.apply(method, instance, [{ challengeId: "invalid-run", hskLevel: 99, questionCount: 1 }]);
        } catch (err: any) {
          console.log(`[Result] Caught expected validation error: ${err.message}`);
        }
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("runner.ts")) {
  ReflectionRunner.scanAndRun()
    .then(() => console.log("\n--- Run Complete. ---"))
    .catch(console.error);
}
