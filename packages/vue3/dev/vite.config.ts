import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@visual-filter/common':  path.resolve(__dirname, '../../../common/src'),
      '@visual-filter/applyer': path.resolve(__dirname, '../../../applyer/src'),
    }
  }
})
