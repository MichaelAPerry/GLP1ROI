import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds to one self-contained dist/index.html that can be emailed or opened offline.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
});
