import "reflect-metadata";

export function ValidateHSK(min: number = 1, max: number = 6) {
  return function (originalMethod: any, context: ClassMethodDecoratorContext) {
    Reflect.defineMetadata("validate:hsk", { min, max }, originalMethod);

    context.addInitializer(function () {
      console.log(`Initialized @ValidateHSK for ${String(context.name)}`);
    });

    const wrapper = function (this: any, ...args: any[]) {
      const params = args[0];
      if (params && typeof params.hskLevel === "number") {
        if (params.hskLevel < min || params.hskLevel > max) {
          throw new Error(
            `Validation Error: HSK Level ${params.hskLevel} is outside allowed range [${min}, ${max}]`
          );
        }
      }
      return originalMethod.apply(this, args);
    };

    // Attach metadata to the wrapper so Reflect can find it on the prototype
    Reflect.defineMetadata("validate:hsk", { min, max }, wrapper);
    return wrapper;
  };
}

export const ConfigMetadataRegistry = {};

export function ConfigValue(envKey: string) {
  return function (value: any, context: ClassFieldDecoratorContext) {
    Reflect.defineMetadata("config:env", envKey, ConfigMetadataRegistry, String(context.name));
    return value;
  };
}

