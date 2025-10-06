export function getCaretClientRect(root: HTMLElement): DOMRect | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!root.contains(range.startContainer)) return null
    const rects = range.getClientRects()
    if (rects && rects.length > 0) {
        return rects[0]
    }
    const dummy = document.createElement('span')
    // Zero-width space to ensure measurable rect
    dummy.textContent = '\u200b'
    range.insertNode(dummy)
    const rect = dummy.getBoundingClientRect()
    dummy.parentNode?.removeChild(dummy)
    // Restore caret to end of dummy position
    const newRange = document.createRange()
    newRange.setStart(range.endContainer, range.endOffset)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
    return rect
}

export function getCaretViewportPosition(root: HTMLElement): { left: number; top: number } | null {
    const rect = getCaretClientRect(root)
    if (!rect) return null
    return { left: rect.left, top: rect.bottom }
}


