// Shim: re-exports window.React for IIFE builds where React is loaded via UMD <script> tag
const R = (globalThis as any).React
export default R
export const {
  createElement, createContext, forwardRef, memo, lazy,
  useCallback, useContext, useEffect, useId, useImperativeHandle,
  useLayoutEffect, useMemo, useReducer, useRef, useState,
  Fragment, Children, cloneElement, isValidElement,
  Suspense, startTransition, useTransition, useDeferredValue,
  useSyncExternalStore, useInsertionEffect, useDebugValue,
} = R
