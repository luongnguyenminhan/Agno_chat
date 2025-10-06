'use client'

import * as React from 'react'
import { getCaretViewportPosition } from './caretUtils'
import { findTriggerRange, replaceRangeWithMention } from './tokenUtils'
import type { MentionSearchItem, Mention } from '../../types/mention.type'

type UseMentionInputOptions = {
    editorRef: React.RefObject<HTMLElement | null>
    search: (query: string) => Promise<MentionSearchItem[]>
    limit?: number
}

export function useMentionInput({ editorRef, search, limit = 8 }: UseMentionInputOptions) {
    const [open, setOpen] = React.useState(false)
    const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null)
    const [items, setItems] = React.useState<MentionSearchItem[]>([])
    const [focusedIndex, setFocusedIndex] = React.useState(-1)
    const triggerRangeRef = React.useRef<Range | null>(null)
    const debounceRef = React.useRef<number | null>(null)

    const close = React.useCallback(() => {
        setOpen(false)
        setItems([])
        setFocusedIndex(-1)
        triggerRangeRef.current = null
    }, [])

    const updatePosition = React.useCallback(() => {
        const editor = editorRef.current
        if (!editor) return
        const pos = getCaretViewportPosition(editor)
        if (pos) setPosition(pos)
    }, [editorRef])

    const runSearch = React.useCallback(async (query: string) => {
        try {
            const res = await search(query)
            setItems(res.slice(0, limit))
            setFocusedIndex(res.length > 0 ? 0 : -1)
            setOpen(true)
        } catch {
            setItems([])
            setFocusedIndex(-1)
            setOpen(true)
        }
    }, [search, limit])

    const onInput = React.useCallback(() => {
        const editor = editorRef.current
        if (!editor) return
        const found = findTriggerRange(editor)
        if (!found) {
            close()
            return
        }
        triggerRangeRef.current = found.range
        updatePosition()
        // Debounce 200ms
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(() => {
            runSearch(found.query)
        }, 200)
    }, [editorRef, updatePosition, runSearch, close])

    const commit = React.useCallback((item: MentionSearchItem) => {
        const editor = editorRef.current
        const r = triggerRangeRef.current
        if (!editor || !r) return false
        const m: Mention = { type: item.type, id: item.id, name: item.name }
        replaceRangeWithMention(editor, r, m, 'short') // Use 'short' format for better UX in input
        close()
        return true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
        if (!open) return false
        if (e.key === 'Escape') {
            e.preventDefault()
            close()
            return true
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)))
            return true
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex((i) => Math.max(0, i - 1))
            return true
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            if (focusedIndex >= 0 && focusedIndex < items.length) {
                e.preventDefault()
                return commit(items[focusedIndex])
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            // Allow newline with popover open
            return false
        }
        return false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, items, focusedIndex, close])

    React.useEffect(() => () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }, [])

    return {
        state: { open, position, items, focusedIndex },
        actions: { onInput, onKeyDown, setFocusedIndex, commit, close, updatePosition },
    }
}

export default useMentionInput


