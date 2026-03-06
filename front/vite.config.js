var _a;
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': resolve(process.cwd(), 'src') },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: (_a = process.env.VITE_API_BASE_URL) !== null && _a !== void 0 ? _a : 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
});
