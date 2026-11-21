export const footnoteSelectionMark = /^custom-footnote-(?:hidden-)?selected-text-(\d{14}-[a-z0-9]{7})$/;
export const visibleFootnoteMark = 'custom-footnote-selected-text';
export const underlineSpanSelector = `span[data-type*="${visibleFootnoteMark}"]`;
export const selectionSpanSelector = 'span[data-type*="selected-text"]';
const atomicInlineSelector = '[contenteditable="false"], [custom-footnote], [data-type~="inline-math"], [data-type~="img"]';

export function getInlineTypes(element: Element) {
    return element.getAttribute('data-type')?.split(/\s+/).filter(Boolean) || [];
}

export function adjacentInlineElement(element: Element, direction: 'previousSibling' | 'nextSibling') {
    let node = element[direction];
    while (node && (node.nodeName === 'WBR' ||
        (node.nodeType === Node.TEXT_NODE && !node.textContent.replace(/[\u200b\u2060\ufeff]/g, '')))) {
        node = node[direction];
    }
    return node instanceof HTMLElement ? node : null;
}

export function clearFootnoteSelectionMarks(element: Element, footnoteIds: ReadonlySet<string>, clearLegacy = false) {
    const types = getInlineTypes(element);
    const remainingTypes = types.filter(type => {
        const id = type.match(footnoteSelectionMark)?.[1];
        if (id) return !footnoteIds.has(id);
        return !clearLegacy || (type !== visibleFootnoteMark && type !== 'custom-footnote-hidden-selected-text');
    });
    if (remainingTypes.length === types.length) return false;
    if (remainingTypes.length > 0) {
        element.setAttribute('data-type', remainingTypes.join(' '));
    } else {
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
