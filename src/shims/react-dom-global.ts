// Shim: re-exports window.ReactDOM for IIFE builds where ReactDOM is loaded via UMD <script> tag
const RD = (globalThis as any).ReactDOM
export default RD
export const { createPortal, flushSync, createRoot, hydrateRoot } = RD
