import { footnoteTextRanges } from './footnoteUnderline';
import { t } from './utils/i18n';

type Boundary = 'start' | 'end';

export type UnderlineOption = {
    label: string;
    getSpans: () => Element[];
    getReference: () => HTMLElement | undefined;
    hasReferenceAfter: (span: Element) => boolean;
    apply: (range: Range) => void;
    remove: () => void;
};

type Drag = {
    pointerId: number;
    boundary: Boundary;
    fixed: Range;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
    moved: boolean;
    preview?: Range;
};

export class FootnoteUnderlineControl {
    private readonly root = document.createElement('div');
    private readonly lines = document.createElement('div');
    private readonly actions = document.createElement('div');
    private readonly handles = {
        start: this.button('footnote-underline-control__handle is-start', t('underline.start')),
        end: this.button('footnote-underline-control__handle is-end', t('underline.end')),
    };
    private readonly remove = this.button('footnote-underline-control__remove', t('underline.remove'));
    private readonly listeners = new AbortController();
    private readonly resizeObserver = new ResizeObserver(() => this.scheduleRender());
    private readonly mutationObserver = new MutationObserver(() => {
        this.drag = undefined;
        this.scheduleRender();
    });
    private option: UnderlineOption;
    private drag?: Drag;
    private frame = 0;

    constructor(
        private readonly editable: HTMLElement,
        private readonly viewport: HTMLElement,
        options: UnderlineOption[],
        private readonly onClose: () => void,
    ) {
        this.option = options[0];
        this.root.className = 'footnote-underline-control';
        this.root.setAttribute('role', 'group');
        this.root.setAttribute('aria-label', t('underline.adjust'));
        this.lines.setAttribute('aria-hidden', 'true');
        this.actions.className = 'footnote-underline-control__actions';

        if (options.length > 1) {
            const select = document.createElement('select');
            select.setAttribute('aria-label', t('underline.footnote'));
            options.forEach(({ label }, index) => select.add(new Option(label || String(index + 1), String(index))));
            select.addEventListener('change', () => {
                this.option = options[select.selectedIndex];
                this.render();
            });
            this.actions.append(select);
        }
        this.remove.textContent = '×';
        this.remove.addEventListener('mousedown', event => event.preventDefault());
        this.remove.addEventListener('click', () => {
            this.option.remove();
            this.close();
        });
        this.actions.append(this.remove);
        this.root.append(this.lines, this.handles.start, this.handles.end, this.actions);

        for (const boundary of ['start', 'end'] as const) {
            const handle = this.handles[boundary];
            handle.addEventListener('pointerdown', event => this.startDrag(event, boundary));
        }
        (editable.closest('dialog') ?? document.body).append(this.root);

        const { signal } = this.listeners;
        document.addEventListener('pointerdown', event => {
            if (!this.root.contains(event.target as Node)) this.close();
        }, { capture: true, signal });
        document.addEventListener('pointermove', event => this.moveDrag(event), { capture: true, signal });
        document.addEventListener('pointerup', event => this.finishDrag(event), { capture: true, signal });
        document.addEventListener('pointercancel', event => {
            if (this.drag?.pointerId !== event.pointerId) return;
            this.drag = undefined;
            this.scheduleRender();
        }, { capture: true, signal });
        document.addEventListener('beforeinput', event => {
            if (editable.contains(event.target as Node)) this.close();
        }, { capture: true, signal });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || event.isComposing) return;
            event.preventDefault();
            event.stopPropagation();
            this.close();
        }, { capture: true, signal });
        document.addEventListener('scroll', () => this.scheduleRender(), { capture: true, signal });
        window.addEventListener('resize', () => this.scheduleRender(), { signal });
        this.resizeObserver.observe(editable);
        this.resizeObserver.observe(viewport);
        this.mutationObserver.observe(editable, {
            subtree: true, childList: true, characterData: true, attributes: true,
            attributeFilter: ['custom-footnote', 'custom-footnote-selection-ref', 'data-id', 'data-href', 'data-type'],
        });
        this.scheduleRender();
    }

    close() {
        this.listeners.abort();
        this.resizeObserver.disconnect();
        this.mutationObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.root.remove();
        this.onClose();
    }

    private button(className: string, label: string) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        button.title = label;
        return button;
    }

    private getRanges(spans = this.option.getSpans()) {
        return spans.map(span => {
            const range = document.createRange();
            range.selectNodeContents(span);
            return range;
        });
    }

    private boundary(range: Range, boundary: Boundary) {
        const point = range.cloneRange();
        point.collapse(boundary === 'start');
        return point;
    }

    private endpoint(range: Range, boundary: Boundary) {
        const caret = this.boundary(range, boundary).getClientRects()[0];
        const rects = range.getClientRects();
        const rect = caret ?? rects[boundary === 'start' ? 0 : rects.length - 1];
        if (!rect) return;
        const fromLeft = (boundary === 'start') === (getComputedStyle(this.editable).direction !== 'rtl');
        return { x: caret || fromLeft ? rect.left : rect.right, top: rect.top, bottom: rect.bottom };
    }

    private scheduleRender() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            if (this.drag?.moved) this.updatePreview(this.drag);
            this.render();
        });
    }

    private render() {
        if (!this.editable.isConnected) return this.close();
        const spans = this.option.getSpans();
        const ranges = this.getRanges(spans);
        const reference = this.option.getReference();
        if (!ranges.length && !reference) return this.close();

        const limits = this.viewport.getBoundingClientRect();
        const left = Math.max(0, limits.left);
        const right = Math.min(window.innerWidth, limits.right);
        const top = Math.max(0, limits.top);
        const bottom = Math.min(window.innerHeight, limits.bottom);
        const visible = (y: number) => y >= top && y < bottom;
        const preview = this.drag?.preview;
        const display = preview ? Array.from(footnoteTextRanges(this.editable, preview), run => run.selected) : ranges;
        const lines = document.createDocumentFragment();
        let lastLine: DOMRect | undefined;
        for (const range of display) {
            for (const rect of range.getClientRects()) {
                const x = Math.max(left, rect.left);
                const width = Math.min(right, rect.right) - x;
                if (!visible(rect.bottom) || width <= 0) continue;
                const line = document.createElement('div');
                line.className = 'footnote-underline-control__line';
                Object.assign(line.style, { left: `${x}px`, top: `${rect.bottom}px`, width: `${width}px` });
                lines.append(line);
                lastLine = rect;
            }
        }
        this.lines.replaceChildren(lines);

        const referenceRect = reference?.getClientRects()[0];
        const empty = referenceRect && { x: referenceRect.left, top: referenceRect.top, bottom: referenceRect.bottom };
        for (const boundary of ['start', 'end'] as const) {
            const range = preview ?? ranges[boundary === 'start' ? 0 : ranges.length - 1];
            const point = range ? this.endpoint(range, boundary) : empty;
            const handle = this.handles[boundary];
            handle.hidden = !reference || !point || !visible(point.bottom) || point.x < left || point.x > right;
            if (!handle.hidden) Object.assign(handle.style, { left: `${point.x}px`, top: `${point.bottom}px` });
        }
        const lastSpan = spans[spans.length - 1];
        this.remove.hidden = !lastSpan || this.option.hasReferenceAfter(lastSpan);
        this.actions.hidden = !lastLine || !!this.drag ||
            (this.remove.hidden && this.actions.firstElementChild === this.remove);
        if (!this.actions.hidden) {
            const width = this.actions.offsetWidth;
            const beside = lastLine.right + 20;
            const x = Math.max(left, Math.min(beside, right - width));
            const y = Math.min(lastLine.bottom + (beside + width <= right ? -1 : 19), bottom - this.actions.offsetHeight);
            Object.assign(this.actions.style, { left: `${x}px`, top: `${y}px` });
        }
    }

    private startDrag(event: PointerEvent, boundary: Boundary) {
        if (event.button !== 0 || this.drag) return;
        const reference = this.option.getReference();
        if (!reference) return;
        const ranges = this.getRanges();
        const range = boundary === 'start' ? ranges[0] : ranges[ranges.length - 1];
        const rect = reference.getClientRects()[0];
        const point = range ? this.endpoint(range, boundary) : rect && { x: rect.left, top: rect.top, bottom: rect.bottom };
        if (!point) return;

        const fixed = range ? this.boundary(boundary === 'start' ? ranges[ranges.length - 1] : ranges[0],
            boundary === 'start' ? 'end' : 'start') : document.createRange();
        if (!range) fixed.setStartBefore(reference);
        event.preventDefault();
        this.handles[boundary].setPointerCapture(event.pointerId);
        this.drag = {
            pointerId: event.pointerId, boundary, fixed,
            offsetX: event.clientX - point.x,
            offsetY: event.clientY - (point.top + point.bottom) / 2,
            x: event.clientX,
            y: event.clientY,
            moved: false,
        };
    }

    private moveDrag(event: PointerEvent) {
        if (this.drag?.pointerId !== event.pointerId) return;
        if (this.drag.x === event.clientX && this.drag.y === event.clientY) return;
        this.drag.moved = true;
        this.drag.x = event.clientX;
        this.drag.y = event.clientY;
        this.scheduleRender();
    }

    private updatePreview(drag: Drag) {
        // Keep hit-testing on the text line even though the pointer starts below it.
        const hit = document.caretRangeFromPoint(drag.x - drag.offsetX, drag.y - drag.offsetY);
        if (!hit || !this.editable.contains(hit.startContainer)) return;
        const range = drag.fixed.cloneRange();
        if (drag.boundary === 'start') range.setStart(hit.startContainer, hit.startOffset);
        else range.setEnd(hit.startContainer, hit.startOffset);
        drag.preview = range.collapsed ? undefined : range;
    }

    private finishDrag(event: PointerEvent) {
        const drag = this.drag;
        if (drag?.pointerId !== event.pointerId) return;
        // A click on a handle does not change the range.
        if (drag.moved || drag.x !== event.clientX || drag.y !== event.clientY) {
            drag.x = event.clientX;
            drag.y = event.clientY;
            this.updatePreview(drag);
        }
        this.drag = undefined;
        if (drag.preview) this.option.apply(drag.preview);
        this.render();
    }
}
