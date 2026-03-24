/**
 * JSX runtime shim for IIFE browser bundle.
 *
 * The automatic JSX transform calls jsx(type, {children, ...props}, key)
 * but React.createElement(type, props, ...children) has a different signature —
 * the 3rd+ args become children, overriding props.children.
 *
 * This shim bridges the two: extracts children from props, passes key correctly,
 * and spreads children as positional args to createElement.
 */
const R = (globalThis as any).React

function jsx(type: any, props: any, key?: any) {
  const { children, ...rest } = props
  if (key !== undefined) rest.key = key
  if (children === undefined) return R.createElement(type, rest)
  if (Array.isArray(children)) return R.createElement(type, rest, ...children)
  return R.createElement(type, rest, children)
}

export { jsx, jsx as jsxs, jsx as jsxDEV }
export const Fragment = R.Fragment
