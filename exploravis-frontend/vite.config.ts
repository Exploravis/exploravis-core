import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";
import type { RollupOptions } from 'rollup';

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["*"],
      exposedHeaders: ["*"]
    }
  },

  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'SYNTAX_ERROR' ||
          (warning.message.includes('Text') && warning.message.includes('ScanCard.tsx'))
        ) {
          return;
        }

        warn(warning);
      }
    } as RollupOptions,
  }

});
