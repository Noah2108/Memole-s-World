import { test } from '@playwright/test';

// Keep each browser's evidence apart and preserve the original Windows images.
export const screenshotPath = (name: string) => test.info().outputPath(name);
