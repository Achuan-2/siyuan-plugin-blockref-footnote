import { Plugin, Dialog, Protyle, IProtyle } from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, getBlockAttrs, refreshSql, pushMsg, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, moveBlock, createDocWithMd, getDoc, getBlockKramdown, getBlockDOM, getBlockDOMs, batchUpdateBlock, openBlock, getBlockByID } from "./api";
import { SettingUtils } from "./libs/setting-utils";
import SettingPanel from "@/SettingPanel.svelte";
import { getDefaultSettings } from "./defaultSettings";
import LoadingDialog from "./components/LoadingDialog.svelte";
import { setPluginInstance, t } from "./utils/i18n";
import FootnoteDock from "@/components/FootnoteDock.svelte";

const STORAGE_NAME = "stroage";
export const SETTINGS_FILE = "config.json";
const zeroWhite = "​"
const contentPlaceholderType = "custom-footnote-content-placeholder";
// 使用不会被思源索引清理的不换行空格承载标记；弹窗定位后会立即删除整个 span。
const contentPlaceholder = `<span data-type="${contentPlaceholderType}">&nbsp;</span>`;

const footnoteContentSelector = '[data-node-id][custom-plugin-footnote-content]';
const footnoteReferenceSelector = '[data-node-id][custom-footnote], span[custom-footnote], ' +
    'span[custom-footnote-selection-ref], span[data-type~="sup"][data-id], ' +
    'span[data-type~="sup"][data-href^="siyuan://blocks/"]';
const footnoteSelectionMark = /^custom-footnote-(?:hidden-)?selected-text-(\d{14}-[a-z0-9]{7})$/;
const blockIDPattern = /^\d{14}-[a-z0-9]{7}$/;

function getReferenceTarget(ref: Element) {
    return ref.getAttribute('data-id') || ref.getAttribute('data-href')?.match(/^siyuan:\/\/blocks\/([^/?#]+)/)?.[1];
}

function getMarkedFootnoteId(ref: Element) {
    const id = ref.getAttribute('custom-footnote');
    return id === 'true' ? getReferenceTarget(ref) : id;
}

function clearFootnoteSelectionMarks(element: Element, footnoteIds: ReadonlySet<string>, clearLegacy = false) {
    const types = element.getAttribute('data-type')?.split(/\s+/).filter(Boolean) || [];
    const remainingTypes = types.filter(type => {
        const id = type.match(footnoteSelectionMark)?.[1];
        if (id) return !footnoteIds.has(id);
        return !clearLegacy || (type !== 'custom-footnote-selected-text' && type !== 'custom-footnote-hidden-selected-text');
    });
    if (remainingTypes.length === types.length) return false;
    if (remainingTypes.length > 0) {
        element.setAttribute('data-type', remainingTypes.join(' '));
    } else {
        element.replaceWith(...element.childNodes);
    }
    return true;
}

function assignCopiedBlockIds(kramdown: string) {
    // 保留围栏代码中的原文，只替换思源在块属性行中导出的 ID。
    const fencedCodeOrBlockId = /^(?<prefix>[ \t]*(?:>[ \t]*)*)(?<fence>`{3,}|~{3,})[^\r\n]*\n[\s\S]*?^\k<prefix>\k<fence>[ \t]*\r?$|^(?<ial>[ \t]*(?:>[ \t]*)*\{:[ \t]+)id="\d{14}-[a-z0-9]{7}"(?=[ \t}])/gm;
    return kramdown.replace(fencedCodeOrBlockId, (match, _prefix, _fence, ial) =>
        ial ? `${ial}id="${window.Lute.NewNodeID()}"` : match);
}



class FootnoteDialog {
    private dialog: HTMLDialogElement;
    public protyle: Protyle;
    private onSubmit: () => void;

    private isDragging: boolean = false;
    private currentX: number;
    private currentY: number;
    private initialX: number;
    private initialY: number;
    private readonly viewportMargin = 12;

    private I18N = {
        "zh-CN": {
            addFootnote: "添加脚注",
            footnoteContent: '脚注内容',
            cancel: '取消',
            ok: "确定"
        },
        "en": {
            addFootnote: "Add Footnote",
            footnoteContent: 'Footnote Content',
            cancel: 'Cancel',
            ok: "OK"
        }
    };

    constructor(
        title: string,
        blockId: string,
        onSubmit: () => void,
        x: number,
        y: number,
        focusContentPlaceholder: boolean,
    ) {
        this.onSubmit = onSubmit;
        let i18n: typeof this.I18N.zh_CN = window.siyuan.config.lang in this.I18N ? this.I18N[window.siyuan.config.lang] : this.I18N.en_US;

        // 允许弹窗外继续交互（不禁用全局交互）

        // 创建dialog
        this.dialog = document.createElement('dialog');
        this.dialog.innerHTML = `
            <div class="dialog-title" style="cursor: move;user-select: none;height: 22px;background-color: var(--b3-theme-background);margin: 0px; border: 1px solid var(--b3-border-color);display: flex;justify-content: space-between;align-items: center;padding: 0 4px;">
                <div style="width: 22px;"></div>
                <div style="font-size: 0.9em;color: var(--b3-theme-on-background);opacity: 0.9;">${i18n.addFootnote}</div>
                <div class="close-button" style="width: 16px;height: 16px;display: flex;align-items: center;justify-content: center;cursor: pointer;color: var(--b3-theme-on-background);">
                    <svg><use xlink:href="#iconClose"></use></svg>
                </div>
            </div>
            <div style="min-width: 0;max-width: 100%;padding: 0 8px;box-sizing: border-box;">
                <div class="protyle-wysiwyg" style="padding: 0px; margin-bottom: 8px">
                    <div style="border-left: 0.5em solid var(--b3-border-color); padding: 8px; margin: 8px 0; background: var(--b3-theme-background);color: var(--b3-theme-on-background);">${title}</div>
                </div>
                <div style="font-weight: bold; margin-bottom: 4px;background: var(--b3-theme-background);color: var(--b3-theme-on-background);">${i18n.footnoteContent}:</div>
                <div id="footnote-protyle-container"></div>
            </div>
        `;

        // --- 弹窗样式 ---
        this.dialog.style.position = 'fixed';
        this.dialog.style.top = '0';
        this.dialog.style.left = '0';
        this.dialog.style.margin = '0';
        this.dialog.style.padding = '0px 0px 20px 0px';
        this.dialog.style.boxSizing = 'border-box';
        this.dialog.style.border = '0px solid var(--b3-border-color)';
        this.dialog.style.borderRadius = '4px';
        this.dialog.style.background = 'var(--b3-theme-background)';
        this.dialog.style.boxShadow = 'var(--b3-dialog-shadow)';
        this.dialog.style.resize = 'auto';
        this.dialog.style.overflow = 'auto';
        this.dialog.style.zIndex = '5';
        this.dialog.style.width = '500px';
        this.dialog.style.maxWidth = `calc(100vw - ${this.viewportMargin * 2}px)`;
        this.dialog.style.maxHeight = `min(500px, calc(100dvh - ${this.viewportMargin * 2}px))`;
        document.body.appendChild(this.dialog);

        // --- 初始化 Protyle 编辑器 ---
        const protyleContainer = this.dialog.querySelector('#footnote-protyle-container');
        this.protyle = new Protyle(window.siyuan.ws.app, protyleContainer as HTMLElement, {
            blockId: blockId,
            rootId: blockId,
            mode: "wysiwyg",
            action: focusContentPlaceholder ? ["cb-get-all"] : ["cb-get-all", "cb-get-focus"],
            click: {
                preventInsetEmptyBlock: true
            },
            render: {
                breadcrumb: true,
                background: false,
                title: false,
                gutter: false,
            },
            handleEmptyContent: () => {
                // 如果块被删除，需要关闭弹窗
                this.dialog.close();

            },
            after: (protyle: Protyle) => {
                if (!focusContentPlaceholder) return;
                requestAnimationFrame(() => this.focusAtContentPlaceholder(protyle));
            },

        });

        // --- 添加事件监听器 ---

        // 1. 监听 'close' 事件，执行所有清理操作
        this.dialog.addEventListener('close', this.destroy);

        // 2. 点击关闭按钮，触发 'close' 事件
        this.dialog.querySelector('.close-button').addEventListener('click', () => {
            this.dialog.close();
        });

        // 3. 将 keydown 事件监听器直接绑定到 dialog 上，需要捕获事件，true意味着在捕获阶段触发，使得 Esc 键从下到上可以被捕获
        this.dialog.addEventListener('keydown', this.handleKeyDown, true);

        // 4. 全局监听器现在只负责拖动和外部点击
        document.addEventListener('dblclick', this.handleOutsideDoubleClick);
        const titleBar = this.dialog.querySelector('.dialog-title') as HTMLElement;
        titleBar.addEventListener('mousedown', this.startDragging);
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.stopDragging);
        window.addEventListener('resize', this.handleViewportChange);
        window.visualViewport?.addEventListener('resize', this.handleViewportChange);
        window.visualViewport?.addEventListener('scroll', this.handleViewportChange);

        // 确保dialog可以交互
        this.dialog.style.pointerEvents = 'auto';
        this.dialog.style.userSelect = 'auto';

        this.dialog.show();
        // dialog 需要先完成一次布局，才能根据实际尺寸放入手机端可视区域。
        requestAnimationFrame(this.positionWithinViewport);

        // 确保 protyle 获得焦点，这样键盘事件才能被 dialog 捕获
        // this.protyle.focus();
    }

    /**
     * 将浏览器选区和 Protyle 内部选区同步到模板的 ${content} 位置。
     * 定位完成后删除临时标记并保存，避免占位标记残留在脚注正文中。
     */
    private focusAtContentPlaceholder(protyle: Protyle): boolean {
        const wysiwyg = protyle.protyle.wysiwyg?.element;
        if (!wysiwyg || !this.dialog?.isConnected) return false;

        const placeholder = wysiwyg.querySelector<HTMLElement>(
            `[data-type~="${contentPlaceholderType}"]`
        );
        if (placeholder) {
            const containingBlock = placeholder.closest<HTMLElement>('[data-node-id]');
            const range = document.createRange();
            range.setStartAfter(placeholder);
            range.collapse(true);
            this.applyProtyleRange(protyle, wysiwyg, range, placeholder);

            // Range 是实时对象；删除其前方的占位节点后，光标会自动留在原位置。
            placeholder.remove();
            this.syncCurrentSelection(protyle, wysiwyg);
            saveViaTransaction(containingBlock ?? wysiwyg);
            return true;
        }

        // 兼容旧数据：旧版本将 ${content} 替换为 U+200B。
        const walker = document.createTreeWalker(wysiwyg, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode() as Text | null;
        while (textNode) {
            const placeholderOffset = textNode.data.indexOf(zeroWhite);
            if (placeholderOffset !== -1) {
                const containingBlock = textNode.parentElement?.closest<HTMLElement>('[data-node-id]');
                const range = document.createRange();
                range.setStart(textNode, placeholderOffset + zeroWhite.length);
                range.collapse(true);
                this.applyProtyleRange(protyle, wysiwyg, range, textNode.parentElement);

                textNode.deleteData(placeholderOffset, zeroWhite.length);
                this.syncCurrentSelection(protyle, wysiwyg);
                saveViaTransaction(containingBlock ?? wysiwyg);
                return true;
            }
            textNode = walker.nextNode() as Text | null;
        }
        return false;
    }

    private applyProtyleRange(
        protyle: Protyle,
        wysiwyg: HTMLElement,
        range: Range,
        scrollTarget: Element | null,
    ) {
        wysiwyg.focus({ preventScroll: true });
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        protyle.protyle.toolbar.range = range;
        scrollTarget?.scrollIntoView({ block: 'nearest' });
    }

    private syncCurrentSelection(protyle: Protyle, wysiwyg: HTMLElement) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (wysiwyg.contains(range.startContainer)) {
            protyle.protyle.toolbar.range = range;
        }
    }

    /**
     * 统一的销毁方法，负责所有清理工作
     */
    private destroy = async () => {
        // 不需要恢复全局交互（未修改过 body 样式）

        // 【关键改动】移除在 document 和 dialog 上添加的事件监听器
        // 不再需要在 document 上移除 keydown
        this.dialog.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.stopDragging);
        window.removeEventListener('resize', this.handleViewportChange);
        window.visualViewport?.removeEventListener('resize', this.handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', this.handleViewportChange);

        const editor = this.protyle as Protyle & { flushPendingTransactions?: () => Promise<void> };
        try {
            await editor?.flushPendingTransactions?.();
        } finally {
            editor?.destroy();
            this.dialog.remove();
        }
        this.onSubmit();
    }

    /**
     * 【关键改动】处理键盘事件的方法现在可以更有效地捕获 Esc
     */
    private handleKeyDown = (event: KeyboardEvent) => {
        // 只关心 Escape 键
        if (event.key === 'Escape') {
            // 立即停止事件传播，防止 Protyle 或其他上层监听器响应
            event.stopPropagation();
            event.preventDefault();

            // 关闭对话框
            this.dialog.close(); // 这将触发上面定义的 'close' 事件监听器
        }
    }

    /**
     * 处理在弹窗外部双击的事件
     */
    private handleOutsideDoubleClick = (event: MouseEvent) => {
        if (!this.dialog.contains(event.target as Node)) {
            // 这里不需要 stopPropagation 和 preventDefault，因为我们只想关闭对话框
            this.dialog.close();
        }
    }

    /**
     * 将弹窗限制在 Visual Viewport 内。手机软键盘弹出后，Visual Viewport
     * 会小于 window.innerHeight，使用它才能避免弹窗下半部分被键盘遮住。
     */
    private positionWithinViewport = () => {
        if (!this.dialog?.isConnected) return;

        const viewport = window.visualViewport;
        const viewportWidth = viewport?.width ?? window.innerWidth;
        const viewportHeight = viewport?.height ?? window.innerHeight;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        const viewportTop = viewport?.offsetTop ?? 0;
        const availableWidth = Math.max(0, viewportWidth - this.viewportMargin * 2);
        const availableHeight = Math.max(0, viewportHeight - this.viewportMargin * 2);

        this.dialog.style.width = `${Math.min(500, availableWidth)}px`;
        this.dialog.style.maxWidth = `${availableWidth}px`;
        this.dialog.style.maxHeight = `${Math.min(500, availableHeight)}px`;

        const rect = this.dialog.getBoundingClientRect();
        const isMobileViewport = viewportWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
        const preferredTop = isMobileViewport
            ? viewportTop + this.viewportMargin
            : viewportTop + (viewportHeight - rect.height) * 0.3;
        const maxLeft = viewportLeft + viewportWidth - rect.width - this.viewportMargin;
        const maxTop = viewportTop + viewportHeight - rect.height - this.viewportMargin;

        this.dialog.style.left = `${Math.max(
            viewportLeft + this.viewportMargin,
            Math.min(viewportLeft + (viewportWidth - rect.width) / 2, maxLeft)
        )}px`;
        this.dialog.style.top = `${Math.max(
            viewportTop + this.viewportMargin,
            Math.min(preferredTop, maxTop)
        )}px`;
    }

    private handleViewportChange = () => {
        requestAnimationFrame(this.positionWithinViewport);
    }

    /**
     * 开始拖动
     */
    private startDragging = (e: MouseEvent) => {
        this.isDragging = true;
        const rect = this.dialog.getBoundingClientRect();
        this.initialX = e.clientX - rect.left;
        this.initialY = e.clientY - rect.top;
        this.dialog.style.cursor = 'move';
    }

    /**
     * 拖动中
     */
    private drag = (e: MouseEvent) => {
        if (!this.isDragging) return;
        e.preventDefault();

        this.currentX = e.clientX - this.initialX;
        this.currentY = e.clientY - this.initialY;

        const rect = this.dialog.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        this.currentX = Math.min(Math.max(0, this.currentX), viewportWidth - rect.width);
        this.currentY = Math.min(Math.max(0, this.currentY), viewportHeight - rect.height);

        this.dialog.style.left = `${this.currentX}px`;
        this.dialog.style.top = `${this.currentY}px`;
    }

    /**
     * 停止拖动
     */
    private stopDragging = () => {
        if (this.isDragging) {
            this.isDragging = false;
            this.dialog.style.cursor = 'auto';
        }
    }
}


class ProgressManager {
    private dialog: Dialog;
    private component: any;
    private currentStep: number = 0;
    private totalSteps: number = 0;
    private currentMessage: string = '';
    private currentDetails: string = '';

    constructor(dialog: Dialog, component: any) {
        this.dialog = dialog;
        this.component = component;
    }

    setTotalSteps(total: number) {
        this.totalSteps = total;
        this.currentStep = 0;
        this.updateProgress();
    }

    nextStep(message?: string, details?: string) {
        this.currentStep++;
        this.updateProgress(message, details);
    }

    updateProgress(message?: string, details?: string) {
        // 更新内部状态
        if (message !== undefined) {
            this.currentMessage = message;
        }
        if (details !== undefined) {
            this.currentDetails = details;
        }

        const progress = this.totalSteps > 0 ? Math.round((this.currentStep / this.totalSteps) * 100) : -1;
        const progressText = this.totalSteps > 0 ? `${this.currentStep}/${this.totalSteps}` : '';

        if (this.component) {
            this.component.$set({
                message: this.currentMessage,
                progress: progress,
                progressText: progressText,
                details: this.currentDetails
            });
        }
    }

    setMessage(message: string, details?: string) {
        this.currentMessage = message;
        if (details !== undefined) {
            this.currentDetails = details;
        }

        if (this.component) {
            this.component.$set({
                message: this.currentMessage,
                details: this.currentDetails
            });
        }
    }
}

export default class PluginFootnote extends Plugin {

    // private isMobile: boolean;
    private settingUtils: SettingUtils;
    private styleElement: HTMLStyleElement;
    private loadingDialog: Dialog;
    private footnoteDock: any;
    private footnoteDockElement: HTMLElement;
    private progressManager: ProgressManager;


    // 添加工具栏按钮
    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push(
            {
                name: "footnote",
                icon: "iconFootnote",
                // hotkey: "⇧⌘F",
                tipPosition: "n",
                tip: this.i18n.tips,
                click: (protyle: Protyle) => {
                    this.protyle = protyle.protyle;
                    this.addMemoBlock(this.protyle);
                }
            }
        );
        return toolbar;
    }




    updateCSS(css: string) {
        this.styleElement.textContent = css;

    }
    async onload() {
        // 设置i18n插件实例
        setPluginInstance(this);

        // 注册快捷键
        this.addCommand({
            langKey: this.i18n.tips,
            langText: this.i18n.tips,
            hotkey: "⇧⌘F",
            callback: () => {
            },
            editorCallback: (protyle: any) => {
                this.protyle = protyle;
                this.addMemoBlock(this.protyle);
            },

        });

        // Add new command for reordering footnotes
        this.addCommand({
            langKey: this.i18n.reorderFootnotes,
            langText: this.i18n.reorderFootnotes,
            hotkey: "",
            callback: async () => {
                // Get current doc ID
                // TODO: 分屏应该选哪个？
                const activeElement = document.querySelector('.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title')?.getAttribute('data-node-id');
                if (activeElement) {
                    // 添加pushMsg
                    this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                    await this.reorderFootnotes(activeElement, true);
                    this.closeLoadingDialog();
                    // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                    if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                        const refreshButton = document.querySelector('.footnote-dock__refresh');
                        if (refreshButton) {
                            refreshButton.click();
                        }
                    }
                    await pushMsg(this.i18n.reorderFootnotes + " Finished");
                }
            },
            editorCallback: async (protyle: any) => {
                if (protyle.block?.rootID) {
                    this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                    await protyle.wysiwyg.flushPendingInput?.();
                    await this.reorderFootnotes(protyle.block.rootID, true);
                    this.closeLoadingDialog();
                    // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                    if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                        const refreshButton = document.querySelector('.footnote-dock__refresh');
                        if (refreshButton) {
                            refreshButton.click();
                        }
                    }
                    await pushMsg(this.i18n.reorderFootnotes + " Finished");
                }
            },
        });
        // Add new command for cancel reordering footnotes
        this.addCommand({
            langKey: this.i18n.cancelReorderFootnotes,
            langText: this.i18n.cancelReorderFootnotes,
            hotkey: "",
            callback: async () => {
                // Get current doc ID
                const activeElement = document.querySelector('.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title')?.getAttribute('data-node-id');
                if (activeElement) {
                    // 添加pushMsg
                    this.showLoadingDialog(this.i18n.cancelReorderFootnotes + " ...");
                    await this.cancelReorderFootnotes(activeElement);
                    this.closeLoadingDialog();
                    // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                    if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                        const refreshButton = document.querySelector('.footnote-dock__refresh');
                        if (refreshButton) {
                            refreshButton.click();
                        }
                    }
                    await pushMsg(this.i18n.cancelReorderFootnotes + " Finished");
                }
            },
            editorCallback: async (protyle: any) => {
                if (protyle.block?.rootID) {
                    this.showLoadingDialog(this.i18n.cancelReorderFootnotes + " ...");
                    await protyle.wysiwyg.flushPendingInput?.();
                    await this.cancelReorderFootnotes(protyle.block.rootID);
                    this.closeLoadingDialog();
                    // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                    if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                        const refreshButton = document.querySelector('.footnote-dock__refresh');
                        if (refreshButton) {
                            refreshButton.click();
                        }
                    }
                    await pushMsg(this.i18n.cancelReorderFootnotes + " Finished");
                }
            },
        });

        this.addCommand({
            langKey: "hideFootnoteSelection",
            langText: this.i18n.hideFootnoteSelection,
            hotkey: "",
            callback: async () => {
                await this._toggleFootnoteSelectionVisibility(false);
            }
        });
        this.addCommand({
            langKey: "showFootnoteSelection",
            langText: this.i18n.showFootnoteSelection,
            hotkey: "",
            callback: async () => {
                await this._toggleFootnoteSelectionVisibility(true);
            }
        });


        // 添加自定义图标
        this.addIcons(`<symbol id="iconFootnote"  viewBox="0 0 32 32">
  <path d="M1.42,26.38V4.85h6.57v2.53h-3.05v16.46h3.05v2.53H1.42Z" />
  <path d="M19.12,21.65h-3.71v-12.13c-1.35,1.1-2.95,1.91-4.79,2.44v-2.92c.97-.27,2.02-.8,3.15-1.56s1.91-1.66,2.33-2.69h3.01v16.86Z" />
  <path d="M30.58,4.85v21.53h-6.57v-2.53h3.05V7.36h-3.05v-2.51h6.57Z" />
</symbol>`);





        this.eventBus.on("open-menu-blockref", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
        this.eventBus.on("open-menu-link", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
        this.eventBus.on("click-blockicon", this.onBlockMenuOpen.bind(this));
        document.addEventListener('beforeinput', this.captureAnchorDeletion, true);
        document.addEventListener('input', this.cleanDeletedAnchorMarks, true);


        // Create style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'snippetCSS-Footnote';
        document.head.appendChild(this.styleElement);
        const settings = await this.loadSettings();
        this.updateCSS(settings.css);

        // 初始化脚注Dock栏
        await this.initFootnoteDock();
    }

    private onBlockMenuOpen({ detail }: any) {
        if (detail.blockElements.length > 1) return;


        // 【新增】判断是否显示删除脚注按钮
        const footnoteId = detail.blockElements[0]?.getAttribute('custom-footnote');
        const blockId = detail.blockElements[0]?.getAttribute('data-node-id');
        if (blockId && footnoteId) {

            this.checkForExistingFootnotes(blockId, footnoteId, detail.menu);
        } else {
            detail.menu.addItem({
                icon: "iconFootnote",
                label: this.i18n.addFootnote || "Add Footnote",
                click: async () => {
                    try {
                        await this.createFootnoteForBlocks(detail.blockElements, detail.protyle.block.rootID);
                    } catch (error) {
                        this.closeLoadingDialog();
                        console.error('Error in createFootnoteForBlocks:', error);
                        await pushErrMsg(error.message);
                    }
                }
            });
        }
    }

    // 【新增】检查是否存在脚注内容块并添加删除按钮
    private async checkForExistingFootnotes(blockId, footnoteId: string, menu: any) {
        // 查询所有与当前块相关的脚注内容块
        menu.addItem({
            icon: "iconFootnote",
            label: this.i18n.jumpToFootnote || "Jump to Footnote",
            click: async () => {
                await openBlock(footnoteId);
            }
        });
        menu.addItem({
            icon: "iconTrashcan",
            label: this.i18n.deleteFootnote || "Delete Footnote",
            click: async () => {
                const footnotes = await sql(`SELECT * FROM blocks WHERE id="${footnoteId}"`);
                // 假设 `footnotes` 数组是按创建时间排序的，或者我们总是删除最新的一个
                // 这里的“最新”可以根据你的需求定义，例如按id（如果id是递增的）或者根据创建时间戳（如果ial中包含了）
                // 暂时我们假设数组的最后一个元素是最新创建的
                if (footnotes.length > 0) {
                    const latestFootnote = footnotes[footnotes.length - 1];
                    const footnoteContentIdToDelete = latestFootnote.id;


                    // 删除脚注内容块本身
                    if (footnoteContentIdToDelete) {
                        await deleteBlock(footnoteContentIdToDelete);
                        // await pushMsg(`Deleted footnote content block: ${footnoteContentIdToDelete}`);
                    }
                }


                // 检查是否所有脚注内容块都已删除，如果是，则从原始块中移除 `custom-footnote` 属性
                await setBlockAttrs(blockId, { "custom-footnote": "" }); // 移除属性
                // await pushMsg(`Removed custom-footnote attribute from block: ${blockId}`);

                // 重新排序脚注（如果启用）
                const settings = await this.loadSettings();
                if (settings.enableOrderedFootnotes) {
                    this.showLoadingDialog(this.i18n.reorderFootnotes + " ...");
                    await this.reorderFootnotes(this.getDocumentId(), true);
                    this.closeLoadingDialog();
                    await pushMsg(this.i18n.reorderFootnotes + " Finished");
                }

                // 更新脚注Dock
                if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                    const refreshButton = document.querySelector('.footnote-dock__refresh');
                    if (refreshButton) {
                        refreshButton.click();
                    }
                }
            }
        });
    }

    private async _toggleFootnoteSelectionVisibility(show: boolean) {
        const docId = this.getDocumentId();
        if (!docId) {
            await pushMsg("Could not find the current document.", 3000);
            return;
        }

        const actionText = show ? this.i18n.showFootnoteSelection : this.i18n.hideFootnoteSelection;
        this.showLoadingDialog(actionText + " ...");

        try {
            // 1. Define selectors based on whether we are showing or hiding
            const sourcePrefix = show ? 'custom-footnote-hidden-selected-text-' : 'custom-footnote-selected-text-';
            const targetPrefix = show ? 'custom-footnote-selected-text-' : 'custom-footnote-hidden-selected-text-';
            const sourceSelector = `[data-type^="${sourcePrefix}"]`;

            // 2. Get the document's DOM
            const docResp = await getBlockDOM(docId);
            if (!docResp?.dom) {
                throw new Error("Failed to get document DOM.");
            }
            const currentDom = new DOMParser().parseFromString(docResp.dom, 'text/html');

            // 3. Find all affected blocks and modify the spans in the parsed DOM
            const affectedBlocks = new Map<string, HTMLElement>();
            const spans = currentDom.querySelectorAll(sourceSelector);

            if (spans.length === 0) {
                await pushMsg("No footnote selections found to change.", 3000);
                return;
            }

            spans.forEach((span: HTMLElement) => {
                // Modify the data-type attribute
                const currentType = span.getAttribute('data-type');
                span.setAttribute('data-type', currentType.replace(sourcePrefix, targetPrefix));

                // Find the parent block and add it to our map of blocks to update
                const blockElement = span.closest('[data-node-id]') as HTMLElement;
                if (blockElement) {
                    const blockId = blockElement.getAttribute('data-node-id');
                    if (blockId && !affectedBlocks.has(blockId)) {
                        affectedBlocks.set(blockId, blockElement);
                    }
                }
            });

            // 4. Prepare the payload for batch update
            const blocksToUpdate = [];
            for (const [blockId, blockElement] of affectedBlocks) {
                blocksToUpdate.push({
                    id: blockId,
                    dataType: "dom",
                    data: blockElement.outerHTML,
                });
            }

            // 5. Execute the batch update if there's anything to change
            if (blocksToUpdate.length > 0) {
                console.log(`Batch updating ${blocksToUpdate.length} blocks to ${show ? 'show' : 'hide'} selections.`);
                await batchUpdateBlock(blocksToUpdate);
                await pushMsg(actionText + " Finished!");
            }

        } catch (error) {
            console.error(`Error during ${actionText}:`, error);
            await pushMsg(`An error occurred: ${error.message}`, 3000);
        } finally {
            this.closeLoadingDialog();
        }
    }

    private async initFootnoteDock() {
        const settings = await this.loadSettings();
        if (settings.enableFootnoteDock) {

            this.addDock({
                config: {
                    position: "RightBottom",
                    size: { width: 300, height: 0 },
                    icon: "iconFootnote",
                    title: this.i18n.footnoteDock?.title || "脚注列表",
                    show: true // 设置为 true，以便立即显示
                },
                data: {},
                type: "footnote-dock",
                init: (dock) => {
                    this.footnoteDockElement = dock.element;
                    this.footnoteDock = new FootnoteDock({
                        target: dock.element,
                        props: {
                            plugin: this
                        }
                    });
                },
                destroy: () => {
                    if (this.footnoteDock) {
                        this.footnoteDock.$destroy();
                        this.footnoteDock = null;
                    }
                }
            });
        }
    }

    /**
     * 打开设置对话框
     */
    async openSetting() {
        let dialog = new Dialog({
            title: t("settingsPanel"),
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            height: "700px",
            destroyCallback: (options) => {
                pannel.$destroy();
            }
        });

        let pannel = new SettingPanel({
            target: dialog.element.querySelector("#SettingPanel"),
            props: {
                plugin: this
            }
        });
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        const settings = await this.loadData(SETTINGS_FILE);
        const defaultSettings = getDefaultSettings();
        return { ...defaultSettings, ...settings };
    }

    /**
     * 保存设置
     */
    async saveSettings(settings: any) {
        await this.saveData(SETTINGS_FILE, settings);

    }

    async handleFootnoteDockToggle(enableFootnoteDock: boolean) {
        if (enableFootnoteDock) {
            // 启用脚注Dock
            await this.initFootnoteDock();
        } else if (!enableFootnoteDock && this.footnoteDock) {
            // 禁用脚注Dock
            this.footnoteDock.$destroy();
            this.footnoteDock = null;
            // 移除dock元素
            document.querySelector('span[data-type="siyuan-plugin-blockref-footnotefootnote-dock"]').remove();

        }
    }

    onLayoutReady() {
    }

    onunload() {
        document.removeEventListener('beforeinput', this.captureAnchorDeletion, true);
        document.removeEventListener('input', this.cleanDeletedAnchorMarks, true);
        if (this.footnoteDock) {
            this.footnoteDock.$destroy();
        }
    }

    private deleteMemo = ({ detail }: any) => {
        const ref = detail.element as HTMLElement | undefined;
        if (!ref?.hasAttribute('custom-footnote')) return;
        const footnoteId = getMarkedFootnoteId(ref);
        if (!footnoteId || !blockIDPattern.test(footnoteId)) return;

        detail.menu.addItem({
            icon: 'iconTrashcan',
            label: this.i18n.deleteFootnote,
            click: async () => {
                await detail.protyle.wysiwyg.flushPendingInput?.();
                await this.deleteFootnoteById(detail.protyle.block.rootID, footnoteId);
            },
        });
    };

    private pendingAnchorDeletions = new WeakMap<Element, { block: Element; ids: Set<string> }>();

    private captureAnchorDeletion = (event: InputEvent) => {
        const editor = (event.target as Element).closest('.protyle-wysiwyg');
        if (!editor) return;
        this.pendingAnchorDeletions.delete(editor);
        if (!event.isTrusted || !event.inputType?.startsWith('delete')) return;

        const node = event.getTargetRanges?.()[0]?.startContainer ?? document.getSelection()?.anchorNode;
        const block = (node instanceof Element ? node : node?.parentElement)?.closest('[data-node-id]');
        if (!block || !editor.contains(block)) return;
        const ids = new Set(Array.from(block.querySelectorAll('span[custom-footnote]'), getMarkedFootnoteId).filter(Boolean));
        if (ids.size > 0) this.pendingAnchorDeletions.set(editor, { block, ids });
    };

    private cleanDeletedAnchorMarks = (event: InputEvent) => {
        if (!event.isTrusted) return;
        const editor = (event.target as Element).closest('.protyle-wysiwyg');
        const pending = this.pendingAnchorDeletions.get(editor);
        if (!pending) return;
        this.pendingAnchorDeletions.delete(editor);
        if (!editor.contains(pending.block)) return;

        // 在思源保存这次输入前，只移除本次删除的脚注标记。
        pending.block.querySelectorAll('span[custom-footnote]').forEach(ref => pending.ids.delete(getMarkedFootnoteId(ref)));
        if (pending.ids.size === 0) return;
        pending.block.querySelectorAll('span[data-type*="selected-text"]').forEach(span => {
            clearFootnoteSelectionMarks(span, pending.ids);
        });
    };

    private async addMemoBlock(protyle: IProtyle) {
        // 在函数开始时就显示进度条，覆盖整个添加脚注的过程
        this.showLoadingDialog(this.i18n.addFootnote || '添加脚注...');

        try {
            await refreshSql();
            const settings = await this.loadSettings();
            // console.log(protyle.block.rootID);
            // 获取当前光标所在块的 ID
            const currentBlockId = protyle.toolbar.range.startContainer.parentElement.closest('[data-node-id]')?.getAttribute('data-node-id');
            const currentParentBlockId = protyle.toolbar.range.startContainer.parentElement.closest('.protyle-wysiwyg > [data-node-id]')?.getAttribute('data-node-id');
            const { x, y } = protyle.toolbar.range.getClientRects()[0]
            let range = protyle.toolbar.range;
            // 先复制选中内容
            const getSelectedHtml = (range: Range): string => {
                // 创建临时容器
                const container = document.createElement('div');
                // 克隆选区内容到容器
                container.appendChild(range.cloneContents());
                // 返回HTML字符串
                return container.innerHTML;
            }
            // 获取选中文本
            const selectionText = protyle.toolbar.range.toString();
            const selection = getSelectedHtml(protyle.toolbar.range);
            const useSelectedTextAsBlockRef = settings.referenceInsertMode === '2';
            if (useSelectedTextAsBlockRef && !selectionText.trim()) {
                this.closeLoadingDialog();
                await pushErrMsg(this.i18n.errors?.selectTextForBlockRef || '请先选择要设为引用的文本');
                return;
            }

            // 获取当前文档标题
            let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${protyle.block.rootID}' LIMIT 1`);
            let currentDocTitle = currentDoc[0].content;

            // 获取脚注容器标题
            let footnoteContainerTitle;
            switch (settings.saveLocation) {
                case '1': // 当前文档
                    footnoteContainerTitle = settings.footnoteContainerTitle.replace(/\$\{filename\}/g, currentDocTitle);
                    // 需要检测输入的title有没有#，没有会自动变为二级title
                    // if (!footnoteContainerTitle.startsWith("#")) {
                    //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                    // }
                    break;
                case '2': // 指定文档
                    footnoteContainerTitle = settings.footnoteContainerTitle2.replace(/\$\{filename\}/g, currentDocTitle);
                    // 需要检测输入的title有没有#，没有会自动变为二级title
                    // if (!footnoteContainerTitle.startsWith("#")) {
                    //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                    // }
                    break;
                case '3': // 子文档
                    footnoteContainerTitle = settings.footnoteContainerTitle3.replace(/\$\{filename\}/g, currentDocTitle);
                    break;
                case '5': // 指定路径存放
                    // 文档本身就是容器，不需要标题
                    footnoteContainerTitle = "";
                    break;
            }
            // 处理文档 ID 和脚注容器 ID
            let docID;
            let footnoteContainerID: string;
            let query_res;
            switch (settings.saveLocation) {
                default:
                case '1': // 当前文档
                    docID = protyle.block.rootID;
                    query_res = await sql(
                        `SELECT * FROM blocks AS b 
         WHERE root_id = '${docID}' 
         AND b.type !='d' 
         AND b.ial like '%custom-plugin-footnote-parent="${protyle.block.rootID}"%' 
         ORDER BY created DESC 
         limit 1`
                    );

                    if (query_res.length == 0) {
                        footnoteContainerID = (await appendBlock("markdown", `${footnoteContainerTitle}`, docID))[0].doOperations[0].id;

                    } else {
                        footnoteContainerID = query_res[0].id;
                        if (settings.updateFootnoteContainerTitle) {
                            await updateBlock("markdown", `${footnoteContainerTitle}`, footnoteContainerID);
                        }
                    }
                    // updateBlock会丢失自定义属性
                    await setBlockAttrs(footnoteContainerID, {
                        "custom-plugin-footnote-parent": protyle.block.rootID
                    });


                    break;

                case '2': // 指定文档
                    docID = settings.docID;
                    if (!docID) {
                        return;
                    }
                    query_res = await sql(
                        `SELECT * FROM blocks AS b 
         WHERE root_id = '${docID}' 
         AND b.type !='d' 
         AND b.ial like '%custom-plugin-footnote-parent="${protyle.block.rootID}"%' 
         ORDER BY created DESC 
         limit 1`
                    );

                    if (query_res.length === 0) {
                        footnoteContainerID = (await appendBlock("markdown", `${footnoteContainerTitle}`, docID))[0].doOperations[0].id;
                    } else {
                        footnoteContainerID = query_res[0].id;
                        if (settings.updateFootnoteContainerTitle) {
                            await updateBlock("markdown", `${footnoteContainerTitle}`, footnoteContainerID);
                        }
                    }

                    await setBlockAttrs(footnoteContainerID, {
                        "custom-plugin-footnote-parent": protyle.block.rootID
                    });
                    break;

                case '3': // 子文档
                    const existingDoc = await sql(
                        `SELECT * FROM blocks WHERE type='d' AND ial like '%custom-plugin-footnote-parent="${protyle.block.rootID}"%' LIMIT 1`
                    );

                    if (existingDoc?.length > 0) {
                        docID = existingDoc[0].id;
                        if (settings.updateFootnoteContainerTitle) {
                            await renameDocByID(docID, footnoteContainerTitle);
                        }

                    } else {
                        const notebook = currentDoc[0].box;
                        const parentPath = currentDoc[0].hpath;
                        docID = await createDocWithMd(notebook, `${parentPath}/${footnoteContainerTitle}`, "");

                        if (!docID) {
                            pushErrMsg("Failed to create child document");
                            return;
                        }

                        await setBlockAttrs(docID, {
                            "custom-plugin-footnote-parent": protyle.block.rootID
                        });

                        // 删除默认生成的块
                        // const defaultBlock = await sql(`SELECT * FROM blocks WHERE root_id = '${docID}' AND type != 'd'`);
                        // console.log(defaultBlock);
                        // if (defaultBlock.length > 0) {
                        //     await deleteBlock(defaultBlock[0].id);
                        // }
                    }
                    footnoteContainerID = docID;
                    break;

                case '4': // 父块后
                    docID = protyle.block.rootID;
                    if (currentParentBlockId == null) {
                        footnoteContainerID = currentBlockId;
                    }
                    else {
                        footnoteContainerID = currentParentBlockId;
                    }
                    break;

                case '5': // 指定路径存放
                    docID = await this.getOrCreateFootnoteDoc(protyle.block.rootID, currentDocTitle, settings);
                    if (!docID) {
                        this.closeLoadingDialog();
                        return;
                    }
                    footnoteContainerID = docID;
                    break;
            }

            // 过滤掉脚注文本 <sup>((id "text"))</sup>
            // 正则表达式匹配包含 custom-footnote="true" 的 <span> 标签
            let customFootnotePattern = /<span[^>]*?custom-footnote=[^>]*?>.*?<\/span>/g;

            // 正则表达式匹配 <span class="katex">...</span> 及其内容
            let katexPattern = /<span class="katex">[\s\S]*?<\/span>(<\/span>)*<\/span>/g;

            // 正则表达式匹配并替换 data-type 中的 custom-footnote-selected-text（包含可能的空格）
            let selectedTextPattern = /\s*custom-footnote-selected-text(?:|-[^"\s>]*)(?="|>|\s)/g;
            let selectedTextPattern2 = /\s*custom-footnote-hidden-selected-text(?:|-[^"\s>]*)(?="|>|\s)/g;
            // 正则表达式匹配不含data-type的普通span标签，提取其中的文本
            let plainSpanPattern = /<span(?![^>]*data-type)[^>]*>(.*?)<\/span>/g;
            // 正则表达式中匹配data-type=为空的span标签，提取其中的文本
            let plainSpanPattern2 = /<span[^>]*data-type=""[^>]*>(.*?)<\/span>/g;


            // 使用 replace() 方法替换匹配的部分为空字符
            let cleanSelection = selection
                .replace(katexPattern, '')
                .replace(customFootnotePattern, '')
                .replace(selectedTextPattern, '')
                .replace(selectedTextPattern2, '')
                .replace(plainSpanPattern, '$1') // 保留span标签中的文本内容
                .replace(plainSpanPattern2, '$1') // 保留span标签中的文本内容
            let templates = settings.templates;
            const hasContentPlaceholder = templates.includes('${content}');
            templates = templates.replace(/\$\{selection\}/g, cleanSelection);
            // selectionText要对特殊符号进行处理，比如把英文双引号变为&quot;
            const escapeHtml = (text: string) => {
                const map: { [key: string]: string } = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;',
                };
                return text.replace(/[&<>"']/g, (m) => map[m]);
            };
            const escapedSelectionText = escapeHtml(selectionText);
            templates = templates.replace(/\$\{selection:text\}/g, escapedSelectionText);
            templates = templates.replace(/\$\{selection:text\}/g, selectionText);
            templates = templates.replace(
                /\$\{content\}/g,
                settings.floatDialogEnable && hasContentPlaceholder ? contentPlaceholder : zeroWhite,
            );
            templates = templates.replace(/\$\{refID\}/g, currentBlockId);
            templates = templates.replace(/\$\{index\}/g, `<span data-type="custom-footnote-index a" data-href="siyuan://blocks/${currentBlockId}">${this.i18n.indexAnchor}</span>`); // 支持添加脚注编号
            templates = templates.replace(/\$\{index:text\}/g, `<span data-type="custom-footnote-index">${this.i18n.indexAnchor}</span>`); // 支持添加脚注编号
            templates = await renderTemplates(templates);

            async function renderTemplates(templates: string): Promise<string> {
                // First pattern to match ${{...}}
                const dollarPattern = /\$(\{\{[^}]*\}\})/g;
                let renderedTemplate = templates;
                let match;

                // Process each ${{...}} block one at a time
                while ((match = dollarPattern.exec(templates)) !== null) {
                    const sprigExpression = match[1]; // 获取{{...}}部分
                    // Render the sprig expression using renderSprig
                    const renderedAction = await renderSprig(sprigExpression);
                    // Replace the entire ${{...}} block with the rendered result
                    renderedTemplate = renderedTemplate.replace(match[0], renderedAction);
                }

                // Finally render the complete template
                return await renderedTemplate;
            }


            // 插入脚注内容
            let back;
            // 如果settings.saveLocation不等于4，则按照设置来插入，否则直接在父块后插入
            if (settings.saveLocation == '4') {
                switch (settings.order) {
                    case '2':
                        // 逆序
                        back = await insertBlock(
                            "markdown",
                            templates,
                            undefined, // nextID 
                            footnoteContainerID, // previousID
                            undefined // parentID
                        );
                        break;
                    case '1':
                    default:

                        function findLastFootnoteId(id) {
                            // 首先找到目标块
                            const targetBlock = document.querySelector(`.protyle-wysiwyg [data-node-id="${id}"]`);
                            if (!targetBlock) {
                                return null;
                            }

                            let lastFootnoteId = null;
                            let nextSibling = targetBlock.nextElementSibling;

                            // 遍历所有后续兄弟元素
                            while (nextSibling) {
                                // 检查是否是脚注元素
                                if (nextSibling.hasAttribute('custom-plugin-footnote-content')) {
                                    lastFootnoteId = nextSibling.getAttribute('data-node-id');
                                } else {
                                    // 如果遇到非脚注元素，跳出循环
                                    break;
                                }
                                nextSibling = nextSibling.nextElementSibling;
                            }

                            return lastFootnoteId; // 返回最后一个脚注的id，如果没有脚注则返回null
                        }

                        let lastFootnoteID = findLastFootnoteId(footnoteContainerID);
                        if (lastFootnoteID == null) {
                            back = await insertBlock(
                                "markdown",
                                templates,
                                undefined, // nextID 
                                footnoteContainerID, // previousID
                                undefined // parentID
                            );
                        }
                        else {
                            back = await insertBlock(
                                "markdown",
                                templates,
                                undefined, // nextID 
                                lastFootnoteID, // previousID
                                undefined // parentID
                            );
                        }
                        break;
                }
            } else {
                back = await this.insertFootnoteInContainer(templates, docID, footnoteContainerID, protyle.block.rootID, settings);
            }

            const newBlockId = back?.[0]?.doOperations?.[0]?.id;
            if (!newBlockId) throw new Error(t('errors.insertFootnoteFailed'));

            // 添加脚注内容属性
            await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": protyle.block.rootID });
            await setBlockAttrs(newBlockId, { "alias": settings.footnoteAlias });



            // --------------------------添加脚注引用 -------------------------- // 
            let memoELement;
            if (useSelectedTextAsBlockRef) {
                // 直接把选中文字转换为引用，不额外插入“[注]”锚文本，也不添加上标。
                protyle.toolbar.range = range;
                protyle.toolbar.setInlineMark(protyle, "block-ref", "range", {
                    type: "id",
                    color: `${newBlockId + zeroWhite + "s" + zeroWhite + selectionText}`
                });
                memoELement = protyle.element.querySelector(`span[data-id="${newBlockId}"]`);
                memoELement?.setAttribute("custom-footnote-selection-ref", "true");
            } else {
                // 默认模式：保留选中文字，并在其后插入独立脚注锚文本。
                protyle.toolbar.range = range;
                if (settings.selectFontStyle === '2') {
                    protyle.toolbar.setInlineMark(protyle, `custom-footnote-selected-text-${newBlockId}`, "range");
                } else {
                    protyle.toolbar.setInlineMark(protyle, `custom-footnote-hidden-selected-text-${newBlockId}`, "range");
                }

                protyle.toolbar.range = range;
                range.collapse(false);
                try {
                    protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
                } catch (e) {
                }

                switch (settings.footnoteRefStyle) {
                    case '2':
                        protyle.toolbar.setInlineMark(protyle, "a sup", "range", {
                            type: "a",
                            color: `${"siyuan://blocks/" + newBlockId + zeroWhite + settings.footnoteBlockref}`
                        });
                        memoELement = protyle.element.querySelector(`span[data-href="siyuan://blocks/${newBlockId}"]`);
                        break;
                    default:
                        protyle.toolbar.setInlineMark(protyle, "block-ref sup", "range", {
                            type: "id",
                            color: `${newBlockId + zeroWhite + "s" + zeroWhite + settings.footnoteBlockref}`
                        });
                        memoELement = protyle.element.querySelector(`span[data-id="${newBlockId}"]`);
                        break;
                }
            }

            const referenceBlockId = memoELement?.closest('[data-node-id]')?.getAttribute('data-node-id');
            if (!referenceBlockId) throw new Error('Footnote reference was not inserted');
            memoELement.setAttribute('custom-footnote', newBlockId);
            const referenceSaved = whenBlockSaved(referenceBlockId, newBlockId);
            saveViaTransaction(memoELement);
            protyle.toolbar.element.classList.add('fn__none');
            await (protyle.wysiwyg as typeof protyle.wysiwyg & { flushPendingInput?: () => Promise<void> }).flushPendingInput?.();
            if (!(await referenceSaved)) {
                // 有些编辑器会话不广播自身事务。检查内核已保存的引用，只补写缺失的属性。
                await refreshSql();
                const saved = await getBlockDOM(referenceBlockId);
                const blockDOM = new DOMParser().parseFromString(saved?.dom || '', 'text/html');
                const ref = Array.from(blockDOM.querySelectorAll('span[data-id], span[data-href]'))
                    .find(element => getReferenceTarget(element) === newBlockId);
                const block = ref?.closest('[data-node-id]');
                if (!block) throw new Error('Footnote reference was not saved');
                if (ref.getAttribute('custom-footnote') !== newBlockId ||
                    (useSelectedTextAsBlockRef && !ref.hasAttribute('custom-footnote-selection-ref'))) {
                    ref.setAttribute('custom-footnote', newBlockId);
                    if (useSelectedTextAsBlockRef) ref.setAttribute('custom-footnote-selection-ref', 'true');
                    if (!(await updateBlock('dom', block.outerHTML, referenceBlockId))) {
                        throw new Error('Failed to save footnote reference attributes');
                    }
                }
            }

            // 新增脚注后，将当前文档内已有的行内脚注引用统一为当前设置的格式。
            await this.syncFootnoteReferenceMode(protyle.block.rootID, settings);
            // --------------------------添加脚注引用 END-------------------------- //

            // --------------------------脚注弹窗 Start-------------------------- // 

            if (settings.floatDialogEnable) {
                // 在显示脚注弹窗之前关闭进度条
                this.closeLoadingDialog();

                // Show footnote dialog with original selection text
                await refreshSql();
                new FootnoteDialog(
                    cleanSelection,
                    newBlockId,
                    async () => {
                        if (settings.enableOrderedFootnotes) {
                            this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                            await this.reorderFootnotes(protyle.block.rootID, true);
                            this.closeLoadingDialog();
                            await pushMsg(this.i18n.reorderFootnotes + " Finished");
                        }

                        // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                        if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                            const refreshButton = document.querySelector('.footnote-dock__refresh');
                            if (refreshButton) {
                                refreshButton.click();
                            }
                        }
                    },
                    x,
                    y, // Position below cursor
                    hasContentPlaceholder,
                );
            } else {
                // 如果不显示脚注弹窗，在这里关闭进度条
                if (settings.enableOrderedFootnotes) {
                    // 保持进度条显示，更新消息
                    this.progressManager?.setMessage(this.i18n.reorderFootnotes + " ...");
                    await this.reorderFootnotes(protyle.block.rootID, true);
                    this.closeLoadingDialog();
                    await pushMsg(this.i18n.reorderFootnotes + " Finished");
                } else {
                    this.closeLoadingDialog();
                }
                // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
                if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                    const refreshButton = document.querySelector('.footnote-dock__refresh');
                    if (refreshButton) {
                        refreshButton.click();
                    }
                }
            }

            // --------------------------添加脚注弹窗 END-------------------------- //

            // 如果是指定路径存放，异步检查和更新脚注文档标题（不阻塞）
            if (settings.saveLocation === '5') {
                this.checkAndUpdateFootnoteDocTitle(protyle.block.rootID, currentDocTitle, settings);
            }
        } catch (error) {
            // 发生错误时关闭进度条
            this.closeLoadingDialog();
            console.error('Error in addMemoBlock:', error);
            await pushErrMsg('添加脚注失败: ' + error.message);
        }
    }

    /**
     * 判断块类型是否可以拥有子块
     */
    private isContainerBlockType(blockType: string): boolean {
        return ['d', 'l', 'i', 'b', 's'].includes(blockType);
    }

    /**
     * 安全地在容器末尾添加内容：若容器为叶子块（如标题、段落），
     * 则使用 previousID 将新块插入到容器之后，避免 "leaf block and cannot have children" 报错
     */
    private async safeAppendToContainer(dataType: "markdown" | "dom", data: string, containerID: string) {
        const container = await getBlockByID(containerID);
        if (container && this.isContainerBlockType(container.type)) {
            return await appendBlock(dataType, data, containerID);
        }
        return await insertBlock(dataType, data, undefined, containerID, undefined);
    }

    private async insertFootnoteInContainer(
        markdown: string,
        docID: string,
        containerID: string,
        sourceDocID: string,
        settings: { saveLocation: string; order: string },
    ) {
        // 子文档和指定路径的容器都是文档本身，新建时无需通过 SQL 判断块类型。
        const containerIsDocument = containerID === docID;
        if (settings.order === '2') {
            return containerIsDocument
                ? prependBlock('markdown', markdown, docID)
                : this.safeAppendToContainer('markdown', markdown, containerID);
        }
        if (settings.saveLocation === '3') {
            return appendBlock('markdown', markdown, docID);
        }

        const doc = await getBlockDOM(docID);
        if (doc?.dom) {
            const parsed = new DOMParser().parseFromString(doc.dom, 'text/html');
            const footnotes = parsed.querySelectorAll(`[data-node-id][custom-plugin-footnote-content="${sourceDocID}"]`);
            const lastFootnoteID = footnotes[footnotes.length - 1]?.getAttribute('data-node-id');
            if (lastFootnoteID) return insertBlock('markdown', markdown, undefined, lastFootnoteID);
        }
        return containerIsDocument
            ? appendBlock('markdown', markdown, docID)
            : this.safeAppendToContainer('markdown', markdown, containerID);
    }

    /**
     * 将当前文档内已有的行内脚注引用同步为当前设置的插入格式。
     * 块级脚注（DIV）不参与转换。
     */
    private async syncFootnoteReferenceMode(docID: string, settings: any) {
        try {
            await refreshSql();
            const docData = await getBlockDOM(docID);
            if (!docData?.dom) return;
            const parsedDoc = new DOMParser().parseFromString(docData.dom, 'text/html');
            const refs = parsedDoc.querySelectorAll<HTMLElement>('span[custom-footnote]');
            const affectedBlocks = new Map<string, HTMLElement>();
            const useSelectedTextAsReference = settings.referenceInsertMode === '2';

            const markContainingBlock = (element: HTMLElement) => {
                const block = element.closest<HTMLElement>('[data-node-id]');
                const blockID = block?.getAttribute('data-node-id');
                if (block && blockID) affectedBlocks.set(blockID, block);
            };

            for (const ref of refs) {
                if (ref.closest(footnoteContentSelector)) continue;
                const footnoteID = getMarkedFootnoteId(ref);
                // 目标与脚注标记冲突时，交给编号流程核对实际存在的脚注块。
                if (!footnoteID || getReferenceTarget(ref) !== footnoteID) continue;
                const originalReferenceDOM = ref.outerHTML;
                const isSelectedTextReference = ref.hasAttribute('custom-footnote-selection-ref');

                if (useSelectedTextAsReference && !isSelectedTextReference) {
                    const selectionElements: HTMLElement[] = [];
                    let previous = ref.previousElementSibling as HTMLElement | null;
                    const visibleMark = `custom-footnote-selected-text-${footnoteID}`;
                    const hiddenMark = `custom-footnote-hidden-selected-text-${footnoteID}`;

                    while (previous) {
                        const dataTypes = previous.getAttribute('data-type')?.split(/\s+/) || [];
                        if (!dataTypes.includes(visibleMark) && !dataTypes.includes(hiddenMark)) break;
                        selectionElements.unshift(previous);
                        previous = previous.previousElementSibling as HTMLElement | null;
                    }

                    // 老数据若找不到对应的选中文字，保留原锚文本，避免丢失正文。
                    if (selectionElements.length === 0) continue;
                    const selectedText = selectionElements.map(element => element.textContent || '').join('');
                    if (!selectedText) continue;

                    ref.textContent = selectedText;
                    ref.setAttribute('data-type', 'block-ref');
                    ref.setAttribute('data-id', footnoteID);
                    ref.setAttribute('data-subtype', 's');
                    ref.setAttribute('custom-footnote-selection-ref', 'true');
                    ref.removeAttribute('data-href');
                    selectionElements.forEach(element => element.remove());
                    if (ref.outerHTML !== originalReferenceDOM) {
                        markContainingBlock(ref);
                    }
                    continue;
                }

                if (!useSelectedTextAsReference) {
                    if (isSelectedTextReference) {
                        const selectionElement = document.createElement('span');
                        selectionElement.textContent = ref.textContent || '';
                        const selectionMark = settings.selectFontStyle === '2'
                            ? `custom-footnote-selected-text-${footnoteID}`
                            : `custom-footnote-hidden-selected-text-${footnoteID}`;
                        selectionElement.setAttribute('data-type', selectionMark);
                        ref.before(selectionElement);
                    }

                    if (!settings.enableOrderedFootnotes) {
                        ref.textContent = settings.footnoteBlockref;
                    }
                    ref.removeAttribute('custom-footnote-selection-ref');
                    if (settings.footnoteRefStyle === '2') {
                        ref.setAttribute('data-type', 'a sup');
                        ref.setAttribute('data-href', `siyuan://blocks/${footnoteID}`);
                        ref.removeAttribute('data-id');
                        ref.removeAttribute('data-subtype');
                    } else {
                        ref.setAttribute('data-type', 'block-ref sup');
                        ref.setAttribute('data-id', footnoteID);
                        ref.setAttribute('data-subtype', 's');
                        ref.removeAttribute('data-href');
                    }
                    if (ref.outerHTML !== originalReferenceDOM) {
                        markContainingBlock(ref);
                    }
                }
            }

            if (affectedBlocks.size > 0) {
                await batchUpdateBlock(Array.from(affectedBlocks, ([id, block]) => ({
                    id,
                    dataType: 'dom',
                    data: block.outerHTML,
                })));
            }
        } catch (error) {
            console.warn('Failed to synchronize footnote reference mode:', error);
        }
    }

    /**
     * 从侧栏删除脚注：保留原选中文字，清理所有行内/块级引用后删除脚注内容块。
     */
    async deleteFootnoteById(docID: string, footnoteID: string) {
        if (!blockIDPattern.test(footnoteID)) return;
        await refreshSql();
        const docData = await getBlockDOM(docID);
        if (!docData?.dom) {
            throw new Error('Failed to load the current document');
        }

        const parsedDoc = new DOMParser().parseFromString(docData.dom, 'text/html');
        const affectedBlocks = new Map<string, HTMLElement>();
        const blockLevelRefs: string[] = [];
        const removedIds = new Set([footnoteID]);

        for (const ref of parsedDoc.querySelectorAll<HTMLElement>(footnoteReferenceSelector)) {
            const id = getMarkedFootnoteId(ref) || getReferenceTarget(ref);
            if (id !== footnoteID) continue;

            const block = ref.closest<HTMLElement>('[data-node-id]');
            if (!block) continue;
            const blockID = block.getAttribute('data-node-id');
            if (ref === block) {
                block.removeAttribute('custom-footnote');
                blockLevelRefs.push(blockID);
                continue;
            }

            // 老版本的标记不带 ID，只清理紧挨着相应脚注的标记。
            for (let previous = ref.previousElementSibling; previous?.tagName === 'SPAN';) {
                const before = previous.previousElementSibling;
                if (!clearFootnoteSelectionMarks(previous, removedIds, true)) break;
                previous = before;
            }
            if (ref.hasAttribute('custom-footnote-selection-ref')) {
                ref.replaceWith(parsedDoc.createTextNode(ref.textContent || ''));
            } else {
                ref.remove();
            }
            affectedBlocks.set(blockID, block);
        }

        for (const span of parsedDoc.querySelectorAll('span[data-type*="selected-text"]')) {
            const block = span.closest<HTMLElement>('[data-node-id]');
            if (block && clearFootnoteSelectionMarks(span, removedIds)) {
                affectedBlocks.set(block.getAttribute('data-node-id'), block);
            }
        }

        if (affectedBlocks.size > 0) {
            const updated = await batchUpdateBlock(Array.from(affectedBlocks, ([id, block]) => ({
                id,
                dataType: 'dom',
                data: block.outerHTML,
            })));
            if (!updated) throw new Error('Failed to remove the footnote references');
        }
        for (const id of blockLevelRefs) {
            if (!affectedBlocks.has(id)) await setBlockAttrs(id, { 'custom-footnote': '' });
        }

        // 引用已写回，之后才删除目标块，避免留下指向已删除块的编号。
        const attrs = await getBlockAttrs(footnoteID);
        if (attrs?.['custom-plugin-footnote-content'] === docID) await deleteBlock(footnoteID);

        const settings = await this.loadSettings();
        if (settings.enableOrderedFootnotes) {
            await this.reorderFootnotes(docID, true);
        }
    }

    /**
     * 获取或创建脚注文档（用于指定路径存放）
     * @param currentDocId 当前文档ID
     * @param currentDocTitle 当前文档标题
     * @param settings 设置
     * @returns 脚注文档ID
     */
    private async getOrCreateFootnoteDoc(currentDocId: string, currentDocTitle: string, settings: any): Promise<string | null> {
        // 1. 检查当前文档是否已有绑定的脚注文档ID
        const currentDocAttrs = await getBlockAttrs(currentDocId);
        const boundFootnoteDocId = currentDocAttrs['custom-plugin-footnote-doc-id'];

        if (boundFootnoteDocId) {
            // 检查绑定的文档是否存在
            const existingDoc = await sql(`SELECT * FROM blocks WHERE id = '${boundFootnoteDocId}' AND type = 'd' LIMIT 1`);
            if (existingDoc?.length > 0) {
                return boundFootnoteDocId;
            }
        }

        // 2. 没有绑定或绑定的文档不存在，需要创建或查找
        const notebook = settings.footnoteNotebook;
        if (!notebook) {
            await pushErrMsg(this.i18n.errors?.noNotebook || '请选择存放脚注的笔记本');
            return null;
        }

        // 解析路径（渲染 sprig 语法和 ${filename}）
        const renderedPath = await this.renderFootnoteDocPath(settings.footnoteDocPath, currentDocTitle);

        // 3. 尝试通过路径查找文档
        const existingDocs = await sql(`
            SELECT * FROM blocks 
            WHERE box = '${notebook}' 
            AND hpath = '${renderedPath}' 
            AND type = 'd' 
            LIMIT 1
        `);

        let docId: string;
        if (existingDocs?.length > 0) {
            // 文档已存在，直接使用
            docId = existingDocs[0].id;
        } else {
            // 4. 文档不存在，创建新文档
            // 更新进度条消息（如果外层已经显示了进度条）
            if (this.progressManager) {
                this.progressManager.setMessage(this.i18n.creatingFootnoteDoc || '正在创建脚注文档...');
            }

            try {
                docId = await createDocWithMd(notebook, renderedPath, "");
                if (!docId) {
                    await pushErrMsg(this.i18n.errors?.createDocFailed || '创建脚注文档失败');
                    return null;
                }
            } catch (error) {
                await pushErrMsg(this.i18n.errors?.createDocFailed || '创建脚注文档失败');
                return null;
            }
        }

        // 5. 绑定脚注文档ID到当前文档
        await setBlockAttrs(currentDocId, {
            "custom-plugin-footnote-doc-id": docId
        });

        return docId;
    }

    /**
     * 在添加脚注完成后，异步检查和更新脚注文档标题
     * @param currentDocId 当前文档ID
     * @param currentDocTitle 当前文档标题
     * @param settings 设置
     */
    private async checkAndUpdateFootnoteDocTitle(currentDocId: string, currentDocTitle: string, settings: any): Promise<void> {
        // 只在开启自动更新且路径包含 ${filename} 时执行
        if (!settings.updateFootnoteContainerTitle || !settings.footnoteDocPath.includes('${filename}')) {
            return;
        }

        try {
            // 获取绑定的脚注文档ID
            const currentDocAttrs = await getBlockAttrs(currentDocId);
            const footnoteDocId = currentDocAttrs['custom-plugin-footnote-doc-id'];
            if (!footnoteDocId) return;

            // 获取脚注文档当前标题
            const footnoteDoc = await sql(`SELECT * FROM blocks WHERE id = '${footnoteDocId}' AND type = 'd' LIMIT 1`);
            if (!footnoteDoc?.length) return;

            const currentTitle = footnoteDoc[0].content;

            // 计算期望的标题
            const renderedPath = await this.renderFootnoteDocPath(settings.footnoteDocPath, currentDocTitle);
            const expectedTitle = renderedPath.split('/').pop() || renderedPath;

            // 如果标题不一致，则更新
            if (expectedTitle && currentTitle !== expectedTitle) {
                await renameDocByID(footnoteDocId, expectedTitle);
            }
        } catch (error) {
            console.warn('Failed to update footnote doc title:', error);
        }
    }

    /**
     * 渲染脚注文档路径（处理 sprig 语法和 ${filename} 变量）
     * @param pathTemplate 路径模板
     * @param filename 文件名
     * @returns 渲染后的路径
     */
    private async renderFootnoteDocPath(pathTemplate: string, filename: string): Promise<string> {
        // 首先处理 ${filename} 变量（因为 renderSprig 不处理这个）
        let renderedPath = pathTemplate.replace(/\$\{filename\}/g, filename);

        // 直接使用 renderSprig 渲染整个路径（处理 {{...}} Sprig 语法）
        try {
            renderedPath = await renderSprig(renderedPath);
        } catch (error) {
            console.warn('Failed to render sprig template:', error);
            // 渲染失败，保留原样
        }

        // 确保路径以 / 开头
        if (!renderedPath.startsWith('/')) {
            renderedPath = '/' + renderedPath;
        }

        return renderedPath;
    }

    private async createFootnoteForBlocks(blocks: Element[], docRootId: string) {
        if (!blocks || blocks.length === 0) {
            return;
        }

        // Initialize current and parent block IDs from the selection
        const firstBlockElement = blocks[0];
        const currentBlockId = firstBlockElement.getAttribute('data-node-id');
        const parentElement = firstBlockElement.parentElement.closest('.protyle-wysiwyg > [data-node-id]');
        const currentParentBlockId = parentElement ? parentElement.getAttribute('data-node-id') : null;

        await refreshSql();
        const settings = await this.loadSettings();

        // 1. Get and combine content from all selected blocks into a single Kramdown string
        let combinedKramdown = "";
        for (const blockEl of blocks) {
            const blockId = blockEl.getAttribute('data-node-id');
            if (blockId) {
                const kramdown = await getBlockKramdown(blockId);
                combinedKramdown += assignCopiedBlockIds(kramdown.kramdown) + "\n\n";
            }
        }
        combinedKramdown = combinedKramdown.trim();
        combinedKramdown = `{{{row\n${combinedKramdown}\n}}}`; // Wrap in a super block
        combinedKramdown = combinedKramdown.replace(/custom-footnote="[^"]*"\s/g, '');
        // 2. Determine footnote container and title based on settings
        let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${docRootId}' LIMIT 1`);
        let currentDocTitle = currentDoc[0].content;

        let footnoteContainerTitle;
        switch (settings.saveLocation) {
            case '1':
                footnoteContainerTitle = settings.footnoteContainerTitle.replace(/\$\{filename\}/g, currentDocTitle);
                // if (!footnoteContainerTitle.startsWith("#")) footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                break;
            case '2':
                footnoteContainerTitle = settings.footnoteContainerTitle2.replace(/\$\{filename\}/g, currentDocTitle);
                // if (!footnoteContainerTitle.startsWith("#")) footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                break;
            case '3':
                footnoteContainerTitle = settings.footnoteContainerTitle3.replace(/\$\{filename\}/g, currentDocTitle);
                break;
            case '5':
                // 对于指定路径存放，标题由路径决定，这里不需要处理
                footnoteContainerTitle = "";
                break;
        }

        // 3. Determine footnote container ID
        let docID;
        let footnoteContainerID: string;
        switch (settings.saveLocation) {
            default:
            case '1': // Current document
                docID = docRootId;
                let query_res1 = await sql(`SELECT * FROM blocks AS b WHERE root_id = '${docID}' AND b.type !='d' AND b.ial like '%custom-plugin-footnote-parent="${docRootId}"%' ORDER BY created DESC limit 1`);
                if (query_res1.length == 0) {
                    footnoteContainerID = (await appendBlock("markdown", `${footnoteContainerTitle}`, docID))[0].doOperations[0].id;
                } else {
                    footnoteContainerID = query_res1[0].id;
                    if (settings.updateFootnoteContainerTitle) await updateBlock("markdown", `${footnoteContainerTitle}`, footnoteContainerID);
                }
                await setBlockAttrs(footnoteContainerID, { "custom-plugin-footnote-parent": docRootId });
                break;

            case '2': // Specified document
                docID = settings.docID;
                if (!docID) return;
                let query_res2 = await sql(`SELECT * FROM blocks AS b WHERE root_id = '${docID}' AND b.type !='d' AND b.ial like '%custom-plugin-footnote-parent="${docRootId}"%' ORDER BY created DESC limit 1`);
                if (query_res2.length === 0) {
                    footnoteContainerID = (await appendBlock("markdown", `${footnoteContainerTitle}`, docID))[0].doOperations[0].id;
                } else {
                    footnoteContainerID = query_res2[0].id;
                    if (settings.updateFootnoteContainerTitle) await updateBlock("markdown", `${footnoteContainerTitle}`, footnoteContainerID);
                }
                await setBlockAttrs(footnoteContainerID, { "custom-plugin-footnote-parent": docRootId });
                break;

            case '3': // Child document
                const existingDoc = await sql(`SELECT * FROM blocks WHERE type='d' AND ial like '%custom-plugin-footnote-parent="${docRootId}"%' LIMIT 1`);
                if (existingDoc?.length > 0) {
                    docID = existingDoc[0].id;
                    if (settings.updateFootnoteContainerTitle) await renameDocByID(docID, footnoteContainerTitle);
                } else {
                    docID = await createDocWithMd(currentDoc[0].box, `${currentDoc[0].hpath}/${footnoteContainerTitle}`, "");
                    if (!docID) { pushErrMsg("Failed to create child document"); return; }
                    await setBlockAttrs(docID, { "custom-plugin-footnote-parent": docRootId });
                }
                footnoteContainerID = docID;
                break;

            case '4': // After parent block
                docID = docRootId;
                footnoteContainerID = currentParentBlockId ?? currentBlockId;
                break;

            case '5': // Custom path
                docID = await this.getOrCreateFootnoteDoc(docRootId, currentDocTitle, settings);
                if (!docID) return;
                footnoteContainerID = docID;
                break;
        }

        // 4. Prepare the template, handling special list formatting
        let templates = settings.templates;
        const hasContentPlaceholder = templates.includes('${content}');
        let selectionReplaced = false;

        const listRegex = /^([\*\-]\s+)\$\{selection\}/m;
        const listMatch = templates.match(listRegex);

        if (listMatch) {
            // Handle special list block format for Siyuan
            const marker = listMatch[1];
            const indentedKramdown = combinedKramdown.split('\n').map(line => '  ' + line).join('\n');
            const listBlockContent = `${marker}\n  {: id="${window.Lute.NewNodeID()}"}\n\n${indentedKramdown}\n`;

            templates = templates.replace(listRegex, listBlockContent);
            selectionReplaced = true;
        } else {
            // Handle generic prefixes (like blockquotes)
            const selectionRegex = /^(.*)\$\{selection\}/m;
            const match = templates.match(selectionRegex);
            const prefix = match ? match[1] : '';

            if (prefix.trim()) {
                const processedKramdown = combinedKramdown.split('\n').map(line => prefix + line).join('\n');
                templates = templates.replace(prefix + '${selection}', '${selection}');
                templates = templates.replace(/\$\{selection\}/g, processedKramdown);
                selectionReplaced = true;
            }
        }
        // Final replacement pass
        if (selectionReplaced) {
            templates = templates.replace(/\$\{selection\}/g, ''); // Clear to avoid duplication
            templates = templates.replace(/\$\{selection:text\}/g, '');
        } else {
            templates = templates.replace(/\$\{selection\}/g, combinedKramdown);
            templates = templates.replace(/\$\{selection:text\}/g, combinedKramdown);
        }

        templates = templates.replace(
            /\$\{content\}/g,
            settings.floatDialogEnable && hasContentPlaceholder ? contentPlaceholder : zeroWhite,
        );
        const firstBlockId = blocks[0].getAttribute('data-node-id');
        templates = templates.replace(/\$\{refID\}/g, firstBlockId);
        templates = templates.replace(/\$\{index\}/g, `<span data-type="custom-footnote-index a" data-href="siyuan://blocks/${firstBlockId}">${this.i18n.indexAnchor}</span>`);
        templates = templates.replace(/\$\{index:text\}/g, `<span data-type="custom-footnote-index">${this.i18n.indexAnchor}</span>`);
        // 5. Insert the new footnote content block
        let back;
        if (settings.saveLocation == '4') {
            switch (settings.order) {
                case '2': // Reverse order
                    back = await insertBlock("markdown", templates, undefined, footnoteContainerID, undefined);
                    break;
                case '1': default: // Default order
                    const findLastFootnoteId = (id) => {
                        const targetBlock = document.querySelector(`.protyle-wysiwyg [data-node-id="${id}"]`);
                        if (!targetBlock) return null;
                        let lastFootnoteId = null;
                        let nextSibling = targetBlock.nextElementSibling;
                        while (nextSibling) {
                            if (nextSibling.hasAttribute('custom-plugin-footnote-content')) {
                                lastFootnoteId = nextSibling.getAttribute('data-node-id');
                            } else {
                                break;
                            }
                            nextSibling = nextSibling.nextElementSibling;
                        }
                        return lastFootnoteId;
                    };
                    let lastFootnoteID = findLastFootnoteId(footnoteContainerID);
                    back = await insertBlock("markdown", templates, undefined, lastFootnoteID ?? footnoteContainerID, undefined);
                    break;
            }
        } else {
            back = await this.insertFootnoteInContainer(templates, docID, footnoteContainerID, docRootId, settings);
        }

        const newBlockId = back?.[0]?.doOperations?.[0]?.id;
        if (!newBlockId) throw new Error(t('errors.insertFootnoteFailed'));
        await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": docRootId, "alias": settings.footnoteAlias });

        // 6. Add a reference attribute to the first selected block
        await setBlockAttrs(firstBlockId, { "custom-footnote": newBlockId });
        firstBlockElement.setAttribute("custom-footnote", newBlockId);
        // 块级新增脚注后，也同步当前文档中已有的行内脚注引用格式。
        await this.syncFootnoteReferenceMode(docRootId, settings);


        // 如果是指定路径存放且显示了加载对话框，现在关闭它
        if (settings.saveLocation === '5') {
            this.closeLoadingDialog();
        }

        // 7. Finalize (show dialog, reorder, etc.)
        if (settings.floatDialogEnable) {
            const rect = blocks[blocks.length - 1].getBoundingClientRect();
            await refreshSql();
            new FootnoteDialog(
                "",
                newBlockId,
                async () => {
                    if (settings.enableOrderedFootnotes) {
                        this.showLoadingDialog(this.i18n.reorderFootnotes + " ...");
                        await this.reorderFootnotes(docRootId, true);
                        this.closeLoadingDialog();
                        await pushMsg(this.i18n.reorderFootnotes + " Finished");
                    }
                },
                rect.x,
                rect.y + rect.height,
                hasContentPlaceholder,
            );
        } else {
            if (settings.enableOrderedFootnotes) {
                this.showLoadingDialog(this.i18n.reorderFootnotes + " ...");
                await this.reorderFootnotes(docRootId, true);
                this.closeLoadingDialog();
                await pushMsg(this.i18n.reorderFootnotes + " Finished");
            }
        }

        // 如果是指定路径存放，异步检查和更新脚注文档标题（不阻塞）
        if (settings.saveLocation === '5') {
            this.checkAndUpdateFootnoteDocTitle(docRootId, currentDocTitle, settings);
        }
    }

    private async reorderFootnotes(docID: string, reorderBlocks: boolean) {
        await this.updateFootnoteNumbers(docID, true, reorderBlocks);
    }

    private async cancelReorderFootnotes(docID: string) {
        await this.updateFootnoteNumbers(docID, false, false);
    }

    private async updateFootnoteNumbers(docID: string, numbered: boolean, reorderBlocks: boolean) {
        const action = numbered ? this.i18n.reorderFootnotes : this.i18n.cancelReorderFootnotes;
        this.progressManager?.setTotalSteps(3);
        this.progressManager?.nextStep(action, '正在读取完整文档...');
        await refreshSql();
        const doc = await getBlockDOM(docID);
        if (!doc?.dom) return;

        // 编辑器可能只加载文档的一部分。用内核的完整文档计算顺序和生成更新。
        const parser = new DOMParser();
        const documentDOM = parser.parseFromString(doc.dom, 'text/html');
        const settings = await this.loadSettings();
        const contents = await sql(`
            SELECT id, root_id FROM blocks
            WHERE ial LIKE '%custom-plugin-footnote-content="${docID}"%'`);
        if (!contents) throw new Error('Failed to load footnote content blocks');
        const contentIDs = new Set<string>(contents.map(block => block.id));
        const contentDOMs = new Map<string, HTMLElement>();
        for (const element of documentDOM.querySelectorAll<HTMLElement>(footnoteContentSelector)) {
            const id = element.getAttribute('data-node-id');
            if (contentIDs.has(id)) contentDOMs.set(id, element);
        }
        const externalDOMs = await getBlockDOMs(contents.filter(block => !contentDOMs.has(block.id)).map(block => block.id));
        for (const [id, html] of Object.entries(externalDOMs)) {
            const element = parser.parseFromString(html, 'text/html').querySelector<HTMLElement>(`[data-node-id="${id}"]`);
            if (element) contentDOMs.set(id, element);
        }

        const indexSelector = 'span[data-type~="custom-footnote-index"]';
        const indexesById = new Map(Array.from(contentDOMs, ([id, content]) => [id, Array.from(
            content.querySelectorAll<HTMLElement>(indexSelector),
        ).filter(index => index.closest(footnoteContentSelector) === content)]));
        const references = Array.from(documentDOM.querySelectorAll<HTMLElement>(footnoteReferenceSelector)).flatMap(ref => {
            // 脚注模板里的正文副本不会参与编号。
            if (ref.closest(footnoteContentSelector)) return [];
            const block = ref.closest<HTMLElement>('[data-node-id]');
            if (!block) return [];
            const markedID = getMarkedFootnoteId(ref);
            const targetID = ref === block ? null : getReferenceTarget(ref);
            const id = [markedID, targetID].find(candidate => contentIDs.has(candidate));
            return [{ ref, block, markedID, targetID, id }];
        });
        const claimedIDs = new Set(references.map(reference => reference.id).filter(Boolean));
        const unresolvedByBlock = new Map<HTMLElement, typeof references>();
        for (const reference of references) {
            if (reference.id || reference.ref === reference.block ||
                (!reference.ref.hasAttribute('custom-footnote') && !reference.ref.hasAttribute('custom-footnote-selection-ref'))) continue;
            const unresolved = unresolvedByBlock.get(reference.block) ?? [];
            unresolved.push(reference);
            unresolvedByBlock.set(reference.block, unresolved);
        }
        const unclaimedBySource = new Map<string, Set<string>>();
        if (unresolvedByBlock.size > 0) {
            for (const [id, indexes] of indexesById) {
                if (claimedIDs.has(id)) continue;
                for (const index of indexes) {
                    const sourceID = getReferenceTarget(index);
                    if (!sourceID) continue;
                    const candidates = unclaimedBySource.get(sourceID) ?? new Set<string>();
                    candidates.add(id);
                    unclaimedBySource.set(sourceID, candidates);
                }
            }
        }

        const updatedBlocks = new Map<string, HTMLElement>();
        const order = new Map<string, number>();
        const retainedIDs = new Set<string>();
        const sourceByCandidate = new Map<string, number>();
        for (const ids of unclaimedBySource.values()) {
            for (const id of ids) sourceByCandidate.set(id, (sourceByCandidate.get(id) ?? 0) + 1);
        }
        for (const reference of references) {
            const { ref, block, markedID, targetID } = reference;
            const blockID = block.getAttribute('data-node-id');
            let { id } = reference;
            const unresolved = unresolvedByBlock.get(block);
            if (!id && unresolved?.length === 1 && unresolved[0] === reference) {
                // 失效引用只在正文块和脚注回链一一对应时恢复，避免按旧编号猜测。
                const candidates = unclaimedBySource.get(blockID);
                const candidate = candidates?.values().next().value;
                if (candidates?.size === 1 && sourceByCandidate.get(candidate) === 1) id = candidate;
            }
            if (!id) {
                if (markedID) retainedIDs.add(markedID);
                continue;
            }

            retainedIDs.add(id);
            if (!order.has(id)) order.set(id, order.size + 1);
            if (ref === block) continue;

            const original = ref.outerHTML;
            ref.setAttribute('custom-footnote', id);
            const isSelectionReference = ref.hasAttribute('custom-footnote-selection-ref');
            if (targetID !== id) {
                const types = new Set(ref.getAttribute('data-type')?.split(/\s+/).filter(Boolean) || []);
                if (!types.has('a') && !types.has('block-ref')) {
                    // 思源可能把指向已不存在块的块引降级为文本，只留下脚注属性。
                    types.add(!isSelectionReference && settings.footnoteRefStyle === '2' ? 'a' : 'block-ref');
                    if (!isSelectionReference) types.add('sup');
                    ref.setAttribute('data-type', Array.from(types).join(' '));
                }
                if (types.has('block-ref')) {
                    ref.setAttribute('data-id', id);
                    ref.setAttribute('data-subtype', 's');
                } else {
                    ref.setAttribute('data-href', `siyuan://blocks/${id}`);
                }
            }
            if (!isSelectionReference) {
                const label = numbered ? `[${order.get(id)}]` : settings.footnoteBlockref;
                const currentLabel = ref.textContent?.replace(/^[\u200b\u2060\ufeff]+|[\u200b\u2060\ufeff]+$/g, '');
                if (currentLabel !== label) ref.textContent = label;
            }
            if (original !== ref.outerHTML) updatedBlocks.set(blockID, block);

            if (markedID && markedID !== id && !contentIDs.has(markedID)) {
                for (const span of block.querySelectorAll('span[data-type*="selected-text"]')) {
                    const types = span.getAttribute('data-type').split(/\s+/);
                    const newTypes = types.map(type => type.match(footnoteSelectionMark)?.[1] === markedID
                        ? type.slice(0, -markedID.length) + id
                        : type);
                    if (types.join(' ') === newTypes.join(' ')) continue;
                    span.setAttribute('data-type', newTypes.join(' '));
                    updatedBlocks.set(blockID, block);
                }
            }
        }

        for (const span of documentDOM.querySelectorAll('span[data-type*="selected-text"]')) {
            if (span.closest(footnoteContentSelector)) continue;
            const ids = new Set(span.getAttribute('data-type').split(/\s+/)
                .map(type => type.match(footnoteSelectionMark)?.[1]).filter(id => id && !retainedIDs.has(id)));
            const block = span.closest<HTMLElement>('[data-node-id]');
            if (block && ids.size > 0 && clearFootnoteSelectionMarks(span, ids)) {
                updatedBlocks.set(block.getAttribute('data-node-id'), block);
            }
        }

        for (const [id, number] of order) {
            const label = numbered ? `[${number}]` : this.i18n.indexAnchor;
            for (const index of indexesById.get(id) ?? []) {
                if (index.textContent === label) continue;
                const block = index.closest<HTMLElement>('[data-node-id]');
                if (!block) continue;
                index.textContent = label;
                updatedBlocks.set(block.getAttribute('data-node-id'), block);
            }
        }

        this.progressManager?.nextStep(action, `正在更新 ${updatedBlocks.size} 个块...`);
        if (updatedBlocks.size > 0) {
            const updated = await batchUpdateBlock(Array.from(updatedBlocks, ([id, block]) => ({
                id,
                dataType: 'dom',
                data: block.outerHTML,
            })));
            if (!updated) throw new Error('Failed to write footnote numbers');
        }
        this.progressManager?.nextStep(action, reorderBlocks ? '正在调整脚注块顺序...' : '脚注编号已更新');
        if (reorderBlocks) {
            const rootIDs = new Set<string>(contents.filter(block => order.has(block.id)).map(block => block.root_id));
            for (const rootID of rootIDs) {
                const rootDOM = rootID === docID ? documentDOM : parser.parseFromString((await getBlockDOM(rootID))?.dom ?? '', 'text/html');
                await this.reorderFootnoteSiblings(rootID, rootDOM, order);
            }
        }
    }

    private async reorderFootnoteSiblings(rootID: string, dom: Document, order: ReadonlyMap<string, number>) {
        // SQL 的 sort 是块类型权重。按照文档里的实际兄弟顺序重排，各组留在原来的容器。
        const parents = new Set(Array.from(dom.querySelectorAll(footnoteContentSelector), element => element.parentElement));
        for (const parent of parents) {
            const siblings = Array.from(parent.children).filter(element => element.hasAttribute('data-node-id'));
            let previous: Element | null = null;
            let group: string[] = [];
            for (const sibling of [...siblings, null]) {
                const id = sibling?.getAttribute('data-node-id');
                if (id && sibling.matches(footnoteContentSelector) && order.has(id)) {
                    group.push(id);
                    continue;
                }
                if (group.length > 1) {
                    const target = [...group].sort((left, right) => order.get(left) - order.get(right));
                    // 思源会把移到折叠标题之后的块放到标题内容末尾。保留第一个目标块作为锚点。
                    const stableGroup = previous?.matches('[data-type="NodeHeading"][fold="1"]')
                        ? group.slice(group.indexOf(target[0]))
                        : group;
                    const stableIDs = new Set(this.findStableSubsequence(stableGroup, target));
                    let previousID = previous?.getAttribute('data-node-id');
                    for (const targetID of target) {
                        if (!stableIDs.has(targetID)) await moveBlock(targetID, previousID, parent.getAttribute('data-node-id') || rootID);
                        previousID = targetID;
                    }
                }
                group = [];
                previous = sibling;
            }
        }
    }

    private findStableSubsequence(currentIds: string[], targetIds: string[]): string[] {
        const targetIndexes = new Map(targetIds.map((id, index) => [id, index]));
        const positions = currentIds.map(id => targetIndexes.get(id));
        const tails: number[] = [];
        const predecessors = new Array(positions.length).fill(-1);

        for (let index = 0; index < positions.length; index++) {
            const position = positions[index];
            if (position === undefined) continue;

            let left = 0;
            let right = tails.length;
            while (left < right) {
                const middle = (left + right) >> 1;
                if (positions[tails[middle]]! < position) {
                    left = middle + 1;
                } else {
                    right = middle;
                }
            }

            if (left > 0) predecessors[index] = tails[left - 1];
            tails[left] = index;
        }

        const stableIds: string[] = [];
        let cursor = tails.length > 0 ? tails[tails.length - 1] : -1;
        while (cursor >= 0) {
            stableIds.push(currentIds[cursor]);
            cursor = predecessors[cursor];
        }
        return stableIds.reverse();
    }

    private getDocumentId() {
        // 尝试获取第一个选择器
        let element = document.querySelector('.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title');

        // 如果第一个选择器获取不到，则尝试获取第二个选择器
        if (!element) {
            element = document.querySelector('.protyle.fn__flex-1:not(.fn__none) .protyle-title');
        }

        // 返回获取到的元素的 data-node-id 属性
        return element?.getAttribute('data-node-id');
    }


    private showLoadingDialog(message: string) {
        if (this.loadingDialog) {
            this.loadingDialog.destroy();
        }
        this.loadingDialog = new Dialog({
            title: "Processing",
            content: `<div id="loadingDialogContent"></div>`,
            width: "350px",
            height: "auto",
            disableClose: true,
            destroyCallback: null
        });

        const loadingComponent = new LoadingDialog({
            target: this.loadingDialog.element.querySelector('#loadingDialogContent'),
            props: {
                message: message,
                progress: -1,
                progressText: '',
                details: ''
            }
        });

        this.progressManager = new ProgressManager(this.loadingDialog, loadingComponent);
    }

    private closeLoadingDialog() {
        if (this.loadingDialog) {
            this.loadingDialog.destroy();
            this.loadingDialog = null;
        }
    }

}

export function saveViaTransaction(protyleElem) {
    let protyle: HTMLElement
    if (protyleElem != null) {
        protyle = protyleElem
    }
    if (protyle === null)
        protyle = document.querySelector(".card__block.fn__flex-1.protyle:not(.fn__none) .protyle-wysiwyg.protyle-wysiwyg--attr")
    if (protyle === null)
        protyle = document.querySelector('.fn__flex-1.protyle:not(.fn__none) .protyle-wysiwyg.protyle-wysiwyg--attr') //需要获取到当前正在编辑的 protyle
    let e = document.createEvent('HTMLEvents')
    e.initEvent('input', true, false)
    protyle.dispatchEvent(e)
}

// 工具栏插入和给引用补属性是两次编辑。只等待带脚注属性的那次块更新。
function whenBlockSaved(blockID: string, footnoteID: string) {
    return new Promise<boolean>(resolve => {
        const ws = window.siyuan.ws.ws;
        const finish = (saved: boolean) => {
            ws.removeEventListener('message', handler);
            clearTimeout(timeout);
            resolve(saved);
        };
        const handler = (event: MessageEvent<string>) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.cmd === 'transactions' && Array.isArray(msg.data) && msg.data.some(transaction =>
                    transaction.doOperations?.some(operation => operation.id === blockID &&
                        typeof operation.data === 'string' && operation.data.includes(`custom-footnote="${footnoteID}"`)))) {
                    finish(true);
                }
            } catch {
                // 其他 WebSocket 消息无需处理。
            }
        };
        const timeout = setTimeout(() => finish(false), 1000);
        ws.addEventListener('message', handler);
    });
}
