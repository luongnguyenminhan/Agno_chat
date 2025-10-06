import type { Mention, MentionOccurrence, MentionType, ApiMention } from '../../types/mention.type'

const TOKEN_REGEX = /@\{(meeting|project|file)\}\{([^}]+)\}/g

export function parseTokensFromText(input: string): { start: number; end: number; mention: Mention }[] {
    const results: { start: number; end: number; mention: Mention }[] = []
    let match: RegExpExecArray | null
    while ((match = TOKEN_REGEX.exec(input)) !== null) {
        const [full, type, name] = match
        const start = match.index
        const end = start + full.length
        // No id in the token format; fallback to using name as identifier for pasted content
        results.push({ start, end, mention: { type: type as MentionType, id: name.trim(), name: name.trim() } })
    }
    return results
}

export function serializeContenteditableToText(root: HTMLElement): { content: string; mentions: MentionOccurrence[] } {
    let content = ''
    const mentions: MentionOccurrence[] = []

    const append = (text: string) => {
        content += text
    }

    const walk = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement
            if (el.dataset && el.dataset.mentionId && el.dataset.mentionType) {
                const name = el.dataset.mentionName || ''
                const id = el.dataset.mentionId || name
                const type = el.dataset.mentionType as MentionType
                // Always serialize to full @{type}{name} format for API, regardless of display mode
                const token = `@{${type}}{${name}}`
                const offset = content.length
                append(token)
                mentions.push({ entity_type: type, entity_id: id, offset_start: offset, offset_end: offset + token.length, length: token.length })
                return // skip subtree
            }
            const tag = el.tagName
            if (tag === 'BR') {
                append('\n')
                return
            }
            if (el !== root) {
                const display = window.getComputedStyle(el).display
                if (display === 'block' || tag === 'DIV' || tag === 'P') {
                    if (!content.endsWith('\n')) append('\n')
                }
            }
            const children = Array.from(el.childNodes)
            for (const child of children) walk(child)
            return
        }
        if (node.nodeType === Node.TEXT_NODE) {
            append((node as Text).data)
            return
        }
    }

    for (const child of Array.from(root.childNodes)) walk(child)

    content = content.replace(/\n{3,}/g, '\n\n')
    return { content: content.trim(), mentions }
}

export function createMentionChip(mention: Mention, displayMode: 'full' | 'short' = 'short'): HTMLSpanElement {
    const chip = document.createElement('span')

    // Display format depends on context
    if (displayMode === 'full') {
        // Show full @{type}{name} format for input/editing
        chip.textContent = `@{${mention.type}}{${mention.name}}`
    } else {
        // Show short @name format for display
        chip.textContent = `@${mention.name}`
    }

    chip.contentEditable = 'false'
    chip.className = 'mention-chip'
    chip.style.backgroundColor = 'var(--mention-bg, rgba(0,120,212,0.12))'
    chip.style.border = '1px solid var(--mention-border, rgba(0,120,212,0.4))'
    chip.style.borderRadius = '6px'
    chip.style.padding = '2px 6px'
    chip.style.margin = '0 1px'
    chip.dataset.mentionId = mention.id
    chip.dataset.mentionType = mention.type
    chip.dataset.mentionName = mention.name
    chip.dataset.mentionDisplayMode = displayMode
    return chip
}

export function replaceRangeWithMention(_root: HTMLElement, range: Range, mention: Mention, displayMode: 'full' | 'short' = 'short') {
    range.deleteContents()
    const chip = createMentionChip(mention, displayMode)
    // temporary highlight effect
    chip.style.transition = 'background-color 0.2s ease, box-shadow 0.2s ease'
    chip.style.backgroundColor = 'rgba(0,120,212,0.15)'
    chip.style.boxShadow = '0 0 0 2px #0078d4'
    window.setTimeout(() => {
        chip.style.backgroundColor = ''
        chip.style.boxShadow = ''
        chip.style.transition = ''
    }, 800)
    range.insertNode(chip)
    // Insert trailing space to continue typing naturally
    const space = document.createTextNode(' ')
    chip.after(space)
    // Move caret after the space
    const sel = window.getSelection()
    if (sel) {
        const r = document.createRange()
        r.setStart(space, 1)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
    }
}

export function findTriggerRange(root: HTMLElement): { range: Range; query: string } | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const baseRange = selection.getRangeAt(0).cloneRange()
    if (!root.contains(baseRange.startContainer)) return null
    // Walk backwards from caret to find '@' after non-word boundary
    let container = baseRange.startContainer
    let offset = baseRange.startOffset
    if (container.nodeType !== Node.TEXT_NODE) {
        // Create a text node for searching
        const tn = document.createTextNode('')
        baseRange.insertNode(tn)
        container = tn
        offset = 0
    }
    const text = (container as Text).data || ''
    const left = text.slice(0, offset)
    // Find last '@' and ensure boundary before it is start|space|punct
    const atIndex = left.lastIndexOf('@')
    if (atIndex === -1) return null
    const boundary = atIndex === 0 ? true : /[^\w]$/.test(left.slice(0, atIndex))
    if (!boundary) return null
    const query = left.slice(atIndex + 1)
    const r = document.createRange()
    r.setStart(container, atIndex)
    r.setEnd(container, offset)
    return { range: r, query }
}

// Convert UI Mention to API mention format
export function convertMentionToApiFormat(mention: Mention, offset: number): ApiMention {
    return {
        entity_type: mention.type,
        entity_id: mention.id,
        offset_start: offset,
        offset_end: offset + mention.name.length + 1 // +1 for @
    }
}