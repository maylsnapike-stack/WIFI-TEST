import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — sayt istalgan papka/subdomenga deploy qilinganda ham ishlaydi
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
