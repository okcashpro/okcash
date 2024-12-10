import { z } from 'zod';

export const linkedInEnvSchema = z.object({
  LINKEDIN_USERNAME: z.string().min(1, 'LinkedIn username is required'),
  LINKEDIN_PASSWORD: z.string().min(1, 'LinkedIn password is required'),
  LINKEDIN_DRY_RUN: z.string().transform(val => val.toLowerCase() === 'true'),
  POST_INTERVAL_MIN: z.string().optional(),
  POST_INTERVAL_MAX: z.string().optional()
});

export async function validateLinkedInConfig(runtime: any) {
  try {
    const config = {
      LINKEDIN_USERNAME: runtime.getSetting('LINKEDIN_USERNAME') || process.env.LINKEDIN_USERNAME,
      LINKEDIN_PASSWORD: runtime.getSetting('LINKEDIN_PASSWORD') || process.env.LINKEDIN_PASSWORD,
      LINKEDIN_DRY_RUN: runtime.getSetting('LINKEDIN_DRY_RUN') || process.env.LINKEDIN_DRY_RUN,
      POST_INTERVAL_MIN: runtime.getSetting('POST_INTERVAL_MIN') || process.env.POST_INTERVAL_MIN,
      POST_INTERVAL_MAX: runtime.getSetting('POST_INTERVAL_MAX') || process.env.POST_INTERVAL_MAX
    };

    return linkedInEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `LinkedIn configuration validation failed:\n${errorMessages}`
      );
    }
    throw error;
  }
}