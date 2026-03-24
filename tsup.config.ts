import { defineConfig } from 'tsup'

export default defineConfig([
  // ESM/CJS builds for Node + bundlers
  {
    entry: {
      'index': 'src/index.ts',
      'react/index': 'src/react/index.ts',
      'next/index': 'src/next/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    external: ['react', 'react-dom', 'next', 'next/navigation', 'next/server', 'zustand', 'zustand/vanilla', 'zustand/middleware', '@neowhale/ui'],
    treeshake: true,
    sourcemap: true,
  },
  // IIFE build for browser <script> tag — landing page rendering
  // React UMD exposes window.React / window.ReactDOM — we shim jsx-runtime
  // to use React.createElement so no separate jsx-runtime global is needed.
  {
    entry: { 'landing': 'src/landing-entry.ts' },
    format: ['iife'],
    globalName: 'WhaleStorefront',
    platform: 'browser',
    noExternal: [/.*/],
    esbuildOptions(opts) {
      opts.external = []
      // Redirect react imports to shims that reference UMD globals
      opts.alias = {
        'react': './src/shims/react-global.ts',
        'react-dom': './src/shims/react-dom-global.ts',
        'react-dom/client': './src/shims/react-dom-global.ts',
        'react/jsx-runtime': './src/shims/jsx-runtime-global.ts',
        'react/jsx-dev-runtime': './src/shims/jsx-runtime-global.ts',
      }
    },
    treeshake: true,
    sourcemap: false,
    dts: false,
    splitting: false,
    clean: false,
  },
])
