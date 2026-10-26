import {defineConfig} from 'vitest/config';
// Test modules run in-process. Production/dev Vite filesystem-deny rules remain in vite.config.ts.
export default defineConfig({test:{environment:'node',maxWorkers:2,hookTimeout:120000,testTimeout:120000}});
