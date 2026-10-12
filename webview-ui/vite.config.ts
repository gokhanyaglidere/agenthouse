import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],base:'./',build:{rolldownOptions:{input:{main:'index.html',activities:'activity-preview.html',observer:'observer.html'}},outDir:'../build/webview',emptyOutDir:true}});
