export const footnoteSelectionMark = /^custom-footnote-(?:hidden-)?selected-text-(\d{14}-[a-z0-9]{7})$/;
export const visibleFootnoteMark = 'custom-footnote-selected-text';
export const underlineSpanSelector = `span[data-type*="${visibleFootnoteMark}"]`;
export const selectionSpanSelector = 'span[data-type*="selected-text"]';
const atomicInlineSelector = '[contenteditable="false"], [custom-footnote], [data-type~="inline-math"], [data-type~="img"]';
const nativeInlineBoundarySelector = 'span:is([data-type~="code"], [data-type~="kbd"], [data-type~="tag"], [data-type~="sup"], [data-type~="sub"], [data-type~="block-ref"], [data-type~="a"])';
const zeroWidthSpace = '\u200b';
const wordJoiner = '\u2060';
type InlineSide = 'previousSibling' | 'nextSibling';

export function getInlineTypes(element: Element) {
    return element.getAttribute('data-type')?.split(/\s+/).filter(Boolean) || [];
}

export function adjacentInlineElement(element: Node, direction: InlineSide) {
    let node = element[direction];
    while (node && (node.nodeName === 'WBR' ||
        (node.nodeType === Node.TEXT_NODE && !node.textContent.replace(/[\u200b\u2060\ufeff]/g, '')))) {
        node = node[direction];
    }
    return node instanceof HTMLElement ? node : null;
}

function underlineTypes(element: Element | null) {
    return element ? getInlineTypes(element).filter(type => type === visibleFootnoteMark ||
        (type.startsWith(`${visibleFootnoteMark}-`) && footnoteSelectionMark.test(type))) : [];
}

function sameUnderline(element: HTMLElement, side: InlineSide) {
    const adjacent = underlineTypes(adjacentInlineElement(element, side));
    return underlineTypes(element).some(type => adjacent.includes(type));
}

function boundaryText(element: HTMLElement, side: InlineSide) {
    let sibling = element[side];
    while (sibling?.nodeName === 'WBR') sibling = sibling[side];
    return sibling instanceof Text ? sibling : null;
}

function ensureBoundary(element: HTMLElement, side: InlineSide) {
    const before = side === 'previousSibling';
    const text = boundaryText(element, side);
    if (text) {
        if (before ? !/[\u200b\u2060\ufeff]$/.test(text.data) : !/^[\u200b\u2060\ufeff]/.test(text.data)) {
            text.insertData(before ? text.length : 0, zeroWidthSpace);
        }
        return text;
    }
    const separator = element.ownerDocument.createTextNode(zeroWidthSpace);
    if (before) element.before(separator);
    else element.after(separator);
    return separator;
}

function setInsideBoundary(span: HTMLElement, atStart: boolean, needed: boolean) {
    // 思源为行内代码等原生元素管理自己的内部占位符。
    if (span.matches(nativeInlineBoundarySelector)) return;
    const text = edgeText(span, atStart);
    if (!text?.length) return;
    const offset = atStart ? 0 : text.length - 1;
    const exists = text.data[offset] === wordJoiner;
    if (needed && !exists) text.insertData(atStart ? 0 : text.length, wordJoiner);
    if (!needed && exists) text.deleteData(offset, 1);
}

export function ensureUnderlineBoundaries(root: HTMLElement) {
    const spans = root.matches(underlineSpanSelector) ? [root] : root.querySelectorAll<HTMLElement>(underlineSpanSelector);
    for (const span of spans) {
        if (!span.closest('[contenteditable="true"]') || !underlineTypes(span).length) continue;
        for (const side of ['previousSibling', 'nextSibling'] as const) {
            const needsBoundary = !sameUnderline(span, side);
            if (needsBoundary) ensureBoundary(span, side);
            setInsideBoundary(span, side === 'previousSibling', needsBoundary);
        }
    }
}

export function removeUnderlineBoundaries(span: HTMLElement) {
    if (span.matches(nativeInlineBoundarySelector)) return;
    setInsideBoundary(span, true, false);
    setInsideBoundary(span, false, false);
    for (const side of ['previousSibling', 'nextSibling'] as const) {
        const text = boundaryText(span, side);
        const before = side === 'previousSibling';
        const offset = before ? text?.length - 1 : 0;
        if (text?.data[offset] !== zeroWidthSpace) continue;
        const neighbor = adjacentInlineElement(text, side);
        if (text.length === 1 && neighbor?.matches(`${underlineSpanSelector}, ${nativeInlineBoundarySelector}`)) continue;
        text.deleteData(offset, 1);
    }
}

function edgeText(span: HTMLElement, atStart: boolean) {
    const walker = span.ownerDocument.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    if (atStart) return walker.nextNode() as Text | null;
    let last: Text | null = null;
    while (walker.nextNode()) last = walker.currentNode as Text;
    return last;
}

function insideOffset(text: Text, atStart: boolean) {
    if (atStart) return Number(text.data.startsWith(wordJoiner));
    return text.length - Number(text.data.endsWith(wordJoiner));
}

export function moveCaretAcrossUnderline(selection: Selection, movingForward: boolean) {
    if (!selection.isCollapsed || !(selection.anchorNode instanceof Text)) return false;
    const text = selection.anchorNode;
    const offset = selection.anchorOffset;
    const current = text.parentElement?.closest<HTMLElement>(underlineSpanSelector);
    const side = movingForward ? 'nextSibling' : 'previousSibling';
    if (current) {
        // 同一条下划线里的加粗、斜体等片段仍是一段连续区域。
        const edge = insideOffset(text, !movingForward);
        if (sameUnderline(current, side) || text !== edgeText(current, !movingForward) ||
            (movingForward ? offset < edge : offset > edge)) return false;
        const outside = ensureBoundary(current, side);
        selection.collapse(outside, movingForward ? 1 : outside.length - 1);
        return true;
    }

    const adjacent = adjacentInlineElement(text, side);
    if (!adjacent?.matches(underlineSpanSelector) || !underlineTypes(adjacent).length) return false;
    const boundaryOffset = movingForward
        ? text.length - Number(/[\u200b\u2060\ufeff]$/.test(text.data))
        : Number(/^[\u200b\u2060\ufeff]/.test(text.data));
    if (movingForward ? offset < boundaryOffset : offset > boundaryOffset) return false;
    const inside = edgeText(adjacent, movingForward);
    if (!inside) return false;
    selection.collapse(inside, insideOffset(inside, movingForward));
    return true;
}

export function clearFootnoteSelectionMarks(element: Element, footnoteIds: ReadonlySet<string>, clearLegacy = false) {
    const types = getInlineTypes(element);
    const remainingTypes = types.filter(type => {
        const id = type.match(footnoteSelectionMark)?.[1];
        if (id) return !footnoteIds.has(id);
        return !clearLegacy || (type !== visibleFootnoteMark && type !== 'custom-footnote-hidden-selected-text');
    });
    if (remainingTypes.length === types.length) return false;
    const wasVisible = element instanceof HTMLElement && underlineTypes(element).length > 0;
    if (remainingTypes.length > 0) {
        element.setAttribute('data-type', remainingTypes.join(' '));
        if (wasVisible && !underlineTypes(element).length) removeUnderlineBoundaries(element);
    } else {
        if (wasVisible) removeUnderlineBoundaries(element);
        element.replaceWith(...element.childNodes);
    }
    return true;
}

/** Split only the editable inline runs touched by the range, keeping other formatting on each fragment. */
export function prepareFootnoteRange(editable: HTMLElement, range: Range, footnoteID: string, legacySpans: Element[] = []) {
    const markedSpans = new Set<Element>();
    const replacements = new Map<Node, DocumentFragment>();
    const mark = `${visibleFootnoteMark}-${footnoteID}`;
    const owner = editable.ownerDocument;
    for (const node of Array.from(editable.childNodes)) {
        if (!range.intersectsNode(node)) continue;
        const span = node instanceof HTMLSpanElement ? node : null;
        if (node.nodeType !== Node.TEXT_NODE && (!span || span.matches(atomicInlineSelector))) continue;

        const selected = owner.createRange();
        selected.selectNodeContents(node);
        if (node.contains(range.startContainer)) selected.setStart(range.startContainer, range.startOffset);
        if (node.contains(range.endContainer)) selected.setEnd(range.endContainer, range.endOffset);
        if (!selected.toString().replace(/[\u200b\u2060\ufeff]/g, '')) continue;

        const before = owner.createRange();
        before.selectNodeContents(node);
        before.setEnd(selected.startContainer, selected.startOffset);
        const after = owner.createRange();
        after.selectNodeContents(node);
        after.setStart(selected.endContainer, selected.endOffset);

        const marked = span ? span.cloneNode(false) as HTMLElement : owner.createElement('span');
        const types = new Set(getInlineTypes(marked));
        types.delete(`custom-footnote-hidden-selected-text-${footnoteID}`);
        const isLegacy = span && legacySpans.includes(span);
        if (isLegacy) types.delete(visibleFootnoteMark);
        types.add(mark);
        marked.setAttribute('data-type', Array.from(types).join(' '));
        marked.append(selected.cloneContents());

        const replacement = owner.createDocumentFragment();
        for (const part of [before.cloneContents(), marked, after.cloneContents()]) {
            if (part instanceof DocumentFragment && !part.hasChildNodes()) continue;
            if (span && part !== marked) {
                const formatted = span.cloneNode(false) as HTMLElement;
                formatted.append(part);
                replacement.append(formatted);
                if (isLegacy) clearFootnoteSelectionMarks(formatted, new Set(), true);
            } else {
                replacement.append(part);
            }
        }
        replacements.set(node, replacement);
        markedSpans.add(marked);
    }
    if (!Array.from(markedSpans).some(span => span.textContent.replace(/[\u200b\u2060\ufeff]/g, '').trim())) return;
    return () => {
        for (const [node, replacement] of replacements) node.parentNode.replaceChild(replacement, node);
        return markedSpans;
    };
}
