'use client'

import { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { WhaleContext } from '../context.js'
import type { Category, CategoryTreeNode } from '../../types.js'

function buildTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function useCategories() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCategories must be used within <WhaleProvider>')

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.listCategories()
      setCategories(data.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const tree = useMemo(() => buildTree(categories), [categories])

  const getCategory = useCallback(async (id: string) => {
    return ctx.client.getCategory(id)
  }, [ctx.client])

  return { categories, tree, loading, error, refresh, getCategory }
}
