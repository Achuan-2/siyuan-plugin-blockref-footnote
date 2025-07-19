import { Plugin, fetchSyncPost, Dialog, Protyle, IProtyle } from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, getBlockAttrs, refreshSql, pushMsg, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, moveBlock, createDocWithMd, getDoc, getBlockKramdown, getBlockDOM, batchUpdateBlock } from "./api";
import { SettingUtils } from "./libs/setting-utils";
import SettingPanel from "@/setting-example.svelte";
import { getDefaultSettings } from "./defaultSettings";
import LoadingDialog from "./components/LoadingDialog.svelte";
import { setPluginInstance, t } from "./utils/i18n";
import FootnoteDock from "@/components/FootnoteDock.svelte";

const STORAGE_NAME = "stroage";
export const SETTINGS_FILE = "config.json";
const zeroWhite = "​"



class FootnoteDialog {
    private dialog: HTMLDialogElement;
    public protyle: Protyle;
    private onSubmit: () => void;

    private isDragging: boolean = false;
    private currentX: number;
    private currentY: number;
    private initialX: number;
    private initialY: number;

    private I18N = {
        zh_CN: {
            addFootnote: "添加脚注",
            footnoteContent: '脚注内容',
            cancel: '取消',
            ok: "确定"
        },
        en_US: {
            addFootnote: "Add Footnote",
            footnoteContent: 'Footnote Content',
            cancel: 'Cancel',
            ok: "OK"
        }
    };

    constructor(title: string, blockId: string, onSubmit: () => void, x: number, y: number) {
        this.onSubmit = onSubmit;
        let i18n: typeof this.I18N.zh_CN = window.siyuan.config.lang in this.I18N ? this.I18N[window.siyuan.config.lang] : this.I18N.en_US;

        this.dialog = document.createElement('dialog');
        this.dialog.innerHTML = `
            <div class="dialog-title" style="cursor: move;user-select: none;height: 22px;background-color: var(--b3-theme-background);margin: 0px; border: 1px solid var(--b3-border-color);display: flex;justify-content: space-between;align-items: center;padding: 0 4px;">
                <div style="width: 22px;"></div>
                <div style="font-size: 0.9em;color: var(--b3-theme-on-background);opacity: 0.9;">${i18n.addFootnote}</div>
                <div class="close-button" style="width: 16px;height: 16px;display: flex;align-items: center;justify-content: center;cursor: pointer;color: var(--b3-theme-on-background);">
                    <svg><use xlink:href="#iconClose"></use></svg>
                </div>
            </div>
            <div style="min-width: 300px;padding: 0 8px;">
                <div class="protyle-wysiwyg" style="padding: 0px; margin-bottom: 8px">
                    <div style="border-left: 0.5em solid var(--b3-border-color); padding: 8px; margin: 8px 0; background: var(--b3-theme-background);color: var(--b3-theme-on-background);">${title}</div>
                </div>
                <div style="font-weight: bold; margin-bottom: 4px;background: var(--b3-theme-background);color: var(--b3-theme-on-background);">${i18n.footnoteContent}:</div>
                <div id="footnote-protyle-container"></div>
            </div>
        `;

        // --- 弹窗样式 ---
        this.dialog.style.position = 'fixed';
        this.dialog.style.top = `30%`;
        this.dialog.style.left = `40%`;
        this.dialog.style.margin = '0';
        this.dialog.style.padding = '0px 0px 20px 0px';
        this.dialog.style.border = '0px solid var(--b3-border-color)';
        this.dialog.style.borderRadius = '4px';
        this.dialog.style.background = 'var(--b3-theme-background)';
        this.dialog.style.boxShadow = 'var(--b3-dialog-shadow)';
        this.dialog.style.resize = 'auto';
        this.dialog.style.overflow = 'auto';
        this.dialog.style.zIndex = '4';
        this.dialog.style.width = "500px"
        this.dialog.style.maxHeight = "500px"
        document.body.appendChild(this.dialog);

        // --- 初始化 Protyle 编辑器 ---
        const protyleContainer = this.dialog.querySelector('#footnote-protyle-container');
        this.protyle = new Protyle(window.siyuan.ws.app, protyleContainer as HTMLElement, {
            blockId: blockId,
            mode: "wysiwyg",
            action: ['cb-get-focus'],
            click: {
                preventInsetEmptyBlock: true
            },
            render: {
                breadcrumb: false,
                background: false,
                title: false,
                gutter: false,
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

        this.dialog.show();

        // 确保 protyle 获得焦点，这样键盘事件才能被 dialog 捕获
        // this.protyle.focus();
    }

    /**
     * 统一的销毁方法，负责所有清理工作
     */
    private destroy = () => {
        // 【关键改动】移除在 document 和 dialog 上添加的事件监听器
        // 不再需要在 document 上移除 keydown
        this.dialog.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.stopDragging);

        // 销毁 Protyle 实例，释放资源 (这是一个好习惯)
        if (this.protyle) {
            this.protyle.destroy();
        }

        this.dialog.remove();
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
                    await this.cancelReorderFootnotes(activeElement, true);
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
                    await this.reorderFootnotes(protyle.block.rootID, true);
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
        detail.menu.addItem({
            icon: "iconFootnote",
            label: this.i18n.addFootnote || "Add Footnote",
            click: async (detail) => {

                const activeDocId = this.getDocumentId();
                if (!activeDocId) {
                    pushErrMsg("Cannot determine active document.");
                    return;
                }

                // Check for multi-selection first
                const selectedBlocks = Array.from(document.querySelectorAll('.layout__wnd--active .protyle-wysiwyg .protyle-wysiwyg--select'));

                if (selectedBlocks.length > 1) {

                    // 合并超级块

                    // Handle multi-block selection
                    await this.createFootnoteForBlocks(selectedBlocks, activeDocId);
                } else {
                    // Handle single block from menu
                    await this.createFootnoteForBlocks(selectedBlocks, activeDocId);
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
        if (this.footnoteDock) {
            this.footnoteDock.$destroy();
        }
    }

    private deleteMemo = ({ detail }: any) => {
        if (detail.element && detail.element.getAttribute("custom-footnote")) {
            detail.menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.deleteFootnote,
                click: async () => {
                    const footnote_content_id = detail.element.getAttribute("custom-footnote");

                    // Clean up styled text before the footnote reference
                    let currentElement = detail.element;
                    while (currentElement.previousElementSibling) {
                        const prevElement = currentElement.previousElementSibling;
                        if (prevElement.tagName === 'SPAN' &&
                            prevElement.getAttribute('data-type')?.includes('custom-footnote-selected-text')) {
                            // Remove the custom style from data-type
                            const currentDataType = prevElement.getAttribute('data-type');
                            const newDataType = currentDataType
                                .replace(/\s*custom-footnote-selected-text(?!-)\s*/g, '') // 只匹配后面没有连字符的情况
                                .replace(new RegExp(`\\s*custom-footnote-selected-text-${footnote_content_id}\\s*`, 'g'), '')
                                .trim();



                            if (newDataType) {
                                prevElement.setAttribute('data-type', newDataType);
                            } else {
                                prevElement.removeAttribute('data-type');
                            }
                        } else {
                            break; // Stop if we find an element without the custom style
                        }
                        currentElement = prevElement;
                    }
                    saveViaTransaction(currentElement);
                    // Delete footnote content block
                    if (footnote_content_id && footnote_content_id != "true") {
                        deleteBlock(footnote_content_id);
                    } else {
                        // Handle legacy format
                        let id;
                        if (detail.element.getAttribute("data-id")) {
                            id = detail.element.getAttribute("data-id");
                        } else {
                            id = detail.element.getAttribute("data-href").match(/blocks\/([^\/]+)/)?.[1];
                        }
                        deleteBlock(id);
                    }

                    // Delete blockref
                    detail.element.remove();
                    saveViaTransaction(detail.element);

                    // Get current document ID and reorder footnotes if enabled
                    const settings = await this.loadSettings();
                    if (settings.enableOrderedFootnotes) {
                        // 获取docID
                        const docID = detail.protyle.block.rootID;
                        if (docID) {
                            // Wait a bit for DOM updates
                            await whenBlockSaved(null, 1000).then(async (msg) => { console.log("saved") });
                            this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                            await this.reorderFootnotes(docID, true);
                            this.closeLoadingDialog();
                            await pushMsg(this.i18n.reorderFootnotes + " Finished");
                        }
                    }
                }
            });
        }
    }

    private async addMemoBlock(protyle: IProtyle) {
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

        // 获取当前文档标题
        let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${protyle.block.rootID}' LIMIT 1`);
        let currentDocTitle = currentDoc[0].content;

        // 获取脚注容器标题
        let footnoteContainerTitle;
        switch (settings.saveLocation) {
            case '1': // 当前文档
                footnoteContainerTitle = settings.footnoteContainerTitle.replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                if (!footnoteContainerTitle.startsWith("#")) {
                    footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                }
                break;
            case '2': // 指定文档
                footnoteContainerTitle = settings.footnoteContainerTitle2.replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                if (!footnoteContainerTitle.startsWith("#")) {
                    footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                }
                break;
            case '3': // 子文档
                footnoteContainerTitle = settings.footnoteContainerTitle3.replace(/\$\{filename\}/g, currentDocTitle);
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
        templates = templates.replace(/\$\{content\}/g, zeroWhite);
        templates = templates.replace(/\$\{refID\}/g, currentBlockId);
        templates = templates.replace(/\$\{index\}/g, `<span data-type="custom-footnote-index a" data-href="siyuan://blocks/${currentBlockId}">${this.i18n.indexAnchor}</span>`); // 支持添加脚注编号
        templates = templates.replace(/\$\{index:text\}/g, `<span data-type="custom-footnote-index>${this.i18n.indexAnchor}</span>`); // 支持添加脚注编号
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
        }
        else {
            switch (settings.order) {
                case '2':
                    // 倒序
                    if (settings.saveLocation != 3) {
                        back = await appendBlock("markdown", templates, footnoteContainerID);
                    } else {
                        back = await prependBlock("markdown", templates, footnoteContainerID);
                    }
                    break;
                case '1':
                default:
                    if (settings.saveLocation != 3) {

                        let footnoteContainerDom = (await getBlockDOM(docID)).dom;
                        // 默认顺序插入
                        const parser = new DOMParser();
                        // 将DOM字符串解析为DOM文档
                        const doc = parser.parseFromString(footnoteContainerDom, 'text/html');

                        // 查找所有符合条件的div元素
                        const footnotes = doc.querySelectorAll(`div[custom-plugin-footnote-content="${protyle.block.rootID}"]`);
                        if (footnotes.length > 0) {
                            const lastFootnote = footnotes[footnotes.length - 1];
                            let lastFootnoteID = lastFootnote.getAttribute('data-node-id');
                            back = await insertBlock(
                                "markdown",
                                templates,
                                undefined, // nextID 
                                lastFootnoteID, // previousID - 放在最后一个子块后面
                                undefined // parentID
                            );
                        } else {
                            // 如果没有找到子块,直接在标题下添加
                            back = await appendBlock("markdown", templates, footnoteContainerID);
                        }
                    }
                    else {
                        back = await appendBlock("markdown", templates, footnoteContainerID);
                    }
                    break;
            }
        }

        let newBlockId = back[0].doOperations[0].id
        // 添加脚注内容属性
        await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": protyle.block.rootID });
        await setBlockAttrs(newBlockId, { "alias": settings.footnoteAlias });



        // --------------------------添加脚注引用 -------------------------- // 
        // 选中的文本添加样式
        protyle.toolbar.range = range;
        if (settings.selectFontStyle === '2') {
            protyle.toolbar.setInlineMark(protyle, `custom-footnote-selected-text-${newBlockId}`, "range");
        } else {
            protyle.toolbar.setInlineMark(protyle, `custom-footnote-hidden-selected-text-${newBlockId}`, "range");
        }

        // 将range的起始点和结束点都移动到选中文本的末尾
        protyle.toolbar.range = range;
        range.collapse(false); // false 表示将光标移动到选中文本的末尾

        // 需要先清除样式，避免带上选中文本的样式
        try {
            protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
        } catch (e) {
        }


        // 添加块引，同时添加上标样式
        let memoELement;
        switch (settings.footnoteRefStyle) {
            case '2':
                // 插入块链接
                protyle.toolbar.setInlineMark(protyle, "a sup", "range", {
                    type: "a",
                    color: `${"siyuan://blocks/" + newBlockId + zeroWhite + settings.footnoteBlockref}`
                });
                memoELement = protyle.element.querySelector(`span[data-href="siyuan://blocks/${newBlockId}"]`);
                break;
            default:
                // 插入块引
                protyle.toolbar.setInlineMark(protyle, "block-ref sup", "range", {
                    type: "id",
                    color: `${newBlockId + zeroWhite + "s" + zeroWhite + settings.footnoteBlockref}`
                });
                memoELement = protyle.element.querySelector(`span[data-id="${newBlockId}"]`);
                break;
        }

        // // 给脚注块引添加属性，方便后续查找，添加其他功能
        if (memoELement) {
            memoELement.setAttribute("custom-footnote", newBlockId);
            // 保存脚注块引添加的自定义属性值
            saveViaTransaction(memoELement)
        }


        // 关闭工具栏
        protyle.toolbar.element.classList.add("fn__none")

        // 等待保存数据
        await whenBlockSaved().then(async (msg) => { console.log("saved") });
        // --------------------------添加脚注引用 END-------------------------- //

        // --------------------------脚注弹窗 Start-------------------------- // 

        if (settings.floatDialogEnable) {
            // Show footnote dialog with original selection text
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
                y // Position below cursor
            );
        } else {

            // 如果.sy__siyuan-plugin-blockref-footnotefootnote-dock.layout__tab--active, 则点击button.footnote-dock__refresh进行更新
            if (document.querySelector(':not(.fn__none) .sy__siyuan-plugin-blockref-footnotefootnote-dock')) {
                const refreshButton = document.querySelector('.footnote-dock__refresh');
                if (refreshButton) {
                    refreshButton.click();
                }
            }
        }
        // --------------------------添加脚注弹窗 END-------------------------- //


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
                combinedKramdown += kramdown.kramdown + "\n\n";
            }
        }
        combinedKramdown = combinedKramdown.trim();
        combinedKramdown = `{{{row\n${combinedKramdown}\n}}}`; // Wrap in a super block
        combinedKramdown = combinedKramdown.replace(/custom-footnote="[^"]*"\s/g, '');
        // combinedKramdown = combinedKramdown.replace(/{: id="[^"]*"/g, '{: ');
        // 2. Determine footnote container and title based on settings
        let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${docRootId}' LIMIT 1`);
        let currentDocTitle = currentDoc[0].content;

        let footnoteContainerTitle;
        switch (settings.saveLocation) {
            case '1':
                footnoteContainerTitle = settings.footnoteContainerTitle.replace(/\$\{filename\}/g, currentDocTitle);
                if (!footnoteContainerTitle.startsWith("#")) footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                break;
            case '2':
                footnoteContainerTitle = settings.footnoteContainerTitle2.replace(/\$\{filename\}/g, currentDocTitle);
                if (!footnoteContainerTitle.startsWith("#")) footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                break;
            case '3':
                footnoteContainerTitle = settings.footnoteContainerTitle3.replace(/\$\{filename\}/g, currentDocTitle);
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
        }

        // 4. Prepare the template, handling special list formatting
        let templates = settings.templates;
        let selectionReplaced = false;

        const listRegex = /^([\*\-]\s+)\$\{selection\}/m;
        const listMatch = templates.match(listRegex);

        if (listMatch) {
            // Handle special list block format for Siyuan
            const marker = listMatch[1];
            const indentedKramdown = combinedKramdown.split('\n').map(line => '  ' + line).join('\n');
            const listBlockContent = `${marker}\n  {: id="20250719092338-0gmazer"}\n\n${indentedKramdown}\n`;

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

        templates = templates.replace(/\$\{content\}/g, zeroWhite);
        const firstBlockId = blocks[0].getAttribute('data-node-id');
        templates = templates.replace(/\$\{refID\}/g, firstBlockId);
        templates = templates.replace(/\$\{index\}/g, `<span data-type="custom-footnote-index a" data-href="siyuan://blocks/${firstBlockId}">${this.i18n.indexAnchor}</span>`);
        templates = templates.replace(/\$\{index:text\}/g, `<span data-type="custom-footnote-index>${this.i18n.indexAnchor}</span>`);
        // 5. Insert the new footnote content block
        let back;
        // (The logic for inserting the block remains the same as the previous version)
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
            switch (settings.order) {
                case '2': // Reverse order
                    back = (settings.saveLocation != '3') ? await appendBlock("markdown", templates, footnoteContainerID) : await prependBlock("markdown", templates, footnoteContainerID);
                    break;
                case '1': default: // Default order
                    if (settings.saveLocation != '3') {
                        const docDom = (await getBlockDOM(docID)).dom;
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(docDom, 'text/html');
                        const footnotes = doc.querySelectorAll(`div[custom-plugin-footnote-content="${docRootId}"]`);
                        if (footnotes.length > 0) {
                            const lastFootnoteID = footnotes[footnotes.length - 1].getAttribute('data-node-id');
                            back = await insertBlock("markdown", templates, undefined, lastFootnoteID, undefined);
                        } else {
                            back = await appendBlock("markdown", templates, footnoteContainerID);
                        }
                    } else {
                        back = await appendBlock("markdown", templates, footnoteContainerID);
                    }
                    break;
            }
        }

        let newBlockId = back[0].doOperations[0].id;
        await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": docRootId, "alias": settings.footnoteAlias });

        // 6. Add a reference attribute to the first selected block
        await setBlockAttrs(firstBlockId, { "custom-footnote": newBlockId });

        // 7. Finalize (show dialog, reorder, etc.)
        if (settings.floatDialogEnable) {
            const rect = blocks[blocks.length - 1].getBoundingClientRect();
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
                rect.y + rect.height
            );
        } else if (settings.enableOrderedFootnotes) {
            this.showLoadingDialog(this.i18n.reorderFootnotes + " ...");
            await this.reorderFootnotes(docRootId, true);
            this.closeLoadingDialog();
            await pushMsg(this.i18n.reorderFootnotes + " Finished");
        }
    }
    private async reorderFootnotes(docID: string, reorderBlocks: boolean, protyle?: any) {
        const settings = await this.loadSettings();
        await refreshSql();

        // 初始化进度管理 (由于合并了步骤，总步数可以调整，但为简化，我们只合并逻辑)
        this.progressManager?.setTotalSteps(3); // 1. 获取DOM, 2. 更新块, 3. 排序块
        this.progressManager?.nextStep(this.i18n.reorderFootnotes, "正在获取文档DOM...");

        // 1. 获取当前文档的DOM
        let currentDom;
        if (protyle) {
            currentDom = protyle.wysiwyg.element;
        } else {
            const doc = await getBlockDOM(docID);
            if (!doc) return;
            currentDom = new DOMParser().parseFromString(doc.dom, 'text/html');
        }

        // 2. 确定脚注容器文档ID (根据设置)
        let footnoteContainerDocID = docID;
        switch (settings.saveLocation) {
            case 2: // Specified document
                footnoteContainerDocID = settings.docID;
                if (!footnoteContainerDocID) return;
                break;
            case 3: // Child document
                const childDoc = await sql(
                    `SELECT * FROM blocks WHERE type='d' AND ial like '%custom-plugin-footnote-parent="${docID}"%' LIMIT 1`
                );
                if (childDoc?.length > 0) {
                    footnoteContainerDocID = childDoc[0].id;
                }
                break;
        }


        // 3. 遍历所有脚注引用，建立顺序映射，并记录锚点块和受影响的块
        const footnoteRefs = currentDom.querySelectorAll('[custom-footnote]');
        const footnoteOrder = new Map<string, number>(); // 存储最终排序: 脚注ID -> 顺序编号 (1, 2, 3...)
        const refAnchorMap = new Map<string, string>();   // 存储首次出现位置: 脚注ID -> 锚点块ID
        const affectedRefBlocks = new Map<string, HTMLElement>(); // 存储受影响的引用块: 块ID -> 块元素
        const processedIds = new Set<string>();
        let counter = 1;

        // 新增：存储每个块内的脚注引用信息，用于编号一致性检查
        const blockRefInfo = new Map<string, Array<{ footnoteId: string, currentNumber: number | null, targetNumber: number }>>();

        for (const ref of footnoteRefs) {
            const footnoteId = ref.getAttribute('custom-footnote');

            // 记录每个脚注的锚点块ID（仅第一次出现时记录）
            if (!refAnchorMap.has(footnoteId)) {
                const anchorBlock = ref.closest('[data-node-id][data-node-index]');
                if (anchorBlock) {
                    refAnchorMap.set(footnoteId, anchorBlock.getAttribute('data-node-id'));
                }
            }

            // 为脚注分配新的顺序编号
            if (!processedIds.has(footnoteId)) {
                footnoteOrder.set(footnoteId, counter);
                processedIds.add(footnoteId);
                counter++;
            }

            // 获取当前脚注引用编号（从 textContent 提取）
            const currentNumberMatch = ref.textContent?.match(/\[(\d+)\]/);
            const currentNumber = currentNumberMatch ? parseInt(currentNumberMatch[1], 10) : null;
            const targetNumber = footnoteOrder.get(footnoteId);

            // 记录包含此引用的块
            const containingBlock = ref.closest('[data-node-id][data-node-index]') as HTMLElement;
            if (containingBlock) {
                const blockId = containingBlock.getAttribute('data-node-id');
                if (blockId) {
                    // 初始化块的脚注引用信息
                    if (!blockRefInfo.has(blockId)) {
                        blockRefInfo.set(blockId, []);
                    }
                    // 添加当前脚注的编号信息
                    blockRefInfo.get(blockId)!.push({ footnoteId, currentNumber, targetNumber });

                    // 更新脚注引用的显示（临时更新 DOM，稍后决定是否需要持久化）
                    if (targetNumber) {
                        ref.textContent = `[${targetNumber}]`;
                    }
                }
            }
        }

        // 检查每个块的编号一致性，仅将需要更新的块加入 affectedRefBlocks
        for (const [blockId, refs] of blockRefInfo) {
            const needsUpdate = refs.some(ref => ref.currentNumber !== ref.targetNumber);
            if (needsUpdate) {
                const blockElement = currentDom.querySelector(`[data-node-id="${blockId}"]`) as HTMLElement;
                if (blockElement) {
                    affectedRefBlocks.set(blockId, blockElement);
                }
            }
        }

        // 4. 【合并更新：一次性准备并批量更新所有受影响的块（包括引用块和内容块）】
        this.progressManager?.nextStep(this.i18n.reorderFootnotes, "正在准备更新所有受影响的块...");

        const allBlocksToUpdate = [];

        // 4.1 准备【引用块】的更新负载
        if (affectedRefBlocks.size > 0) {
            let processedRefBlocks = 0;
            const totalRefBlocks = affectedRefBlocks.size;
            for (const [blockId, blockElement] of affectedRefBlocks) {
                allBlocksToUpdate.push({
                    id: blockId,
                    dataType: "dom",
                    data: blockElement.outerHTML,
                });

                processedRefBlocks++;
                if (processedRefBlocks % 5 === 0 || processedRefBlocks === totalRefBlocks) {
                    this.progressManager?.setMessage(this.i18n.reorderFootnotes, `正在处理引用块 ${processedRefBlocks}/${totalRefBlocks}`);
                }
            }
        }

        // 4.2 【优化】准备【脚注内容块】的更新负载
        if (footnoteOrder.size > 0) {
            const footnoteIds = Array.from(footnoteOrder.keys());
            const numberExtractionRegex = /<span[^>]*data-type="[^"]*custom-footnote-index[^>]*>\[(\d+)\]<\/span>/;

            // 并行获取所有脚注块的DOM，以提高效率
            const footnoteBlockDOMs = await Promise.all(
                footnoteIds.map(id => getBlockDOM(id).catch(e => {
                    console.warn(`获取脚注内容块 ${id} 的DOM失败`, e);
                    return null; // 即使某个请求失败，也继续处理其他的
                }))
            );

            let processedContentBlocks = 0;
            const totalContentBlocks = footnoteOrder.size;

            for (const footnoteBlockDOM of footnoteBlockDOMs) {
                processedContentBlocks++;
                // 更新进度
                if (processedContentBlocks % 5 === 0 || processedContentBlocks === totalContentBlocks) {
                    this.progressManager?.setMessage(this.i18n.reorderFootnotes, `正在检查脚注编号 ${processedContentBlocks}/${totalContentBlocks}`);
                }

                if (!footnoteBlockDOM?.dom || !footnoteBlockDOM.id) continue;

                const footnoteId = footnoteBlockDOM.id;
                const newNumber = footnoteOrder.get(footnoteId);
                const originalDOM = footnoteBlockDOM.dom;

                const match = numberExtractionRegex.exec(originalDOM);
                const currentNumber = match ? parseInt(match[1], 10) : NaN;

                // 【核心改进】仅当编号确实需要更新时才执行操作
                if (currentNumber === newNumber) {
                    continue; // 编号已正确，无需更新
                }

                const updatedDOM = originalDOM.replace(
                    /(<span[^>]*data-type="[^"]*custom-footnote-index[^"]*"[^>]*>)\[[^\]]*\](<\/span>)/g,
                    `$1[${newNumber}]$2`
                );

                allBlocksToUpdate.push({
                    id: footnoteId,
                    dataType: "dom",
                    data: updatedDOM,
                });
            }
        }



        // 5. 如果需要，对脚注内容块进行物理排序

        if (reorderBlocks && footnoteOrder.size > 0) {
            // 1. 获取所有相关的脚注内容块，按其当前物理顺序
            const allFootnoteBlocks = await sql(`
    SELECT * FROM blocks 
    WHERE ial like '%custom-plugin-footnote-content="${docID}"%' 
    ORDER BY sort ASC`); // 使用 'sort' 通常比 'created' 更能代表当前顺序

            const relevantBlocks = allFootnoteBlocks.filter(block => footnoteOrder.has(block.id));

            if (relevantBlocks.length > 0) {
                const containerQuery = await sql(`
        SELECT * FROM blocks 
        WHERE root_id = '${footnoteContainerDocID}' 
        AND ial like '%custom-plugin-footnote-parent="${docID}"%' 
        LIMIT 1`);

                if (containerQuery.length > 0) {
                    const containerId = containerQuery[0].id;

                    // 1. 获取当前物理顺序的ID数组
                    const currentOrderIds = relevantBlocks.map(block => block.id);

                    // 2. 获取目标顺序的ID数组
                    const targetOrderIds = Array.from(footnoteOrder.keys());

                    // 3. 【核心改进】使用LCS算法进行智能排序
                    const lcsIds = findLCS(currentOrderIds, targetOrderIds);
                    const lcsSet = new Set(lcsIds); // 使用Set以获得O(1)的查找性能

                    console.log(`Target order has ${targetOrderIds.length} blocks. LCS has ${lcsSet.size} blocks. Moves needed: ${targetOrderIds.length - lcsSet.size}`);

                    if (targetOrderIds.length !== lcsSet.size) { // 仅在需要移动时执行
                        let previousID = containerId; // 移动操作的前一个锚点块
                        let lcsIndex = 0;

                        // 计算需要移动的块数量
                        const totalMovesNeeded = targetOrderIds.length - lcsSet.size;
                        let currentMoveIndex = 0;

                        for (let i = 0; i < targetOrderIds.length; i++) {
                            const targetId = targetOrderIds[i];

                            // 检查当前目标块是否是LCS的一部分（即是否是稳定锚点）
                            if (lcsIndex < lcsIds.length && targetId === lcsIds[lcsIndex]) {
                                // 是稳定块，不移动它，只更新锚点
                                previousID = targetId;
                                lcsIndex++;
                            } else {
                                // 是需要移动的块
                                currentMoveIndex++;
                                try {
                                    // 更新进度显示
                                    this.progressManager?.setMessage(
                                        this.i18n.reorderFootnotes,
                                        `正在移动块 ${currentMoveIndex}/${totalMovesNeeded}...`
                                    );

                                    // console.log(`Moving ${targetId} after ${previousID}`);
                                    await moveBlock(targetId, previousID, containerId);
                                    // 移动后，它成为新的锚点
                                    previousID = targetId;
                                } catch (error) {
                                    console.warn('Failed to move block:', targetId, error);
                                }
                            }
                        }

                        // 移动完成后的最终状态更新
                        this.progressManager?.setMessage(
                            this.i18n.reorderFootnotes,
                            `块移动完成 (${totalMovesNeeded}/${totalMovesNeeded})`
                        );
                    } else {
                        console.log('Footnote blocks are already in the correct order. No move operation is needed.');
                    }
                }
            }
        }

        // 4.3 执行统一的批量更新
        if (allBlocksToUpdate.length > 0) {
            try {
                console.log(`Batch updating ${allBlocksToUpdate.length} blocks in total (references and contents).`);
                this.progressManager?.setMessage(this.i18n.reorderFootnotes, `正在批量更新 ${allBlocksToUpdate.length} 个块...`);
                await batchUpdateBlock(allBlocksToUpdate);
            } catch (error) {
                console.error('Failed to batch update blocks (references or contents):', error);
                // 注意：合并更新后，回退逻辑变得复杂，因为可能涉及多个文档。
            }
        }




        /**
 * 查找两个数组的最长公共子序列 (LCS)
 * @param a - 数组A
 * @param b - 数组B
 * @returns {Array} - 包含LCS元素的数组
 */
        function findLCS<T>(a: T[], b: T[]): T[] {
            const m = a.length;
            const n = b.length;
            const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    if (a[i - 1] === b[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1] + 1;
                    } else {
                        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                    }
                }
            }

            const lcs: T[] = [];
            let i = m, j = n;
            while (i > 0 && j > 0) {
                if (a[i - 1] === b[j - 1]) {
                    lcs.unshift(a[i - 1]);
                    i--;
                    j--;
                } else if (dp[i - 1][j] > dp[i][j - 1]) {
                    i--;
                } else {
                    j--;
                }
            }
            return lcs;
        }

    }

    /**
     * 取消脚注的重新编号，将所有引用和内容块的编号重置为占位符。
     * 参考 reorderFootnotes 的批量处理逻辑进行了优化。
     * @param docID - 当前文档的ID。
     * @param reorderBlocks - (此函数中未使用，但保留签名以保持一致性)
     */
    private async cancelReorderFootnotes(docID: string, reorderBlocks: boolean) {
        const settings = await this.loadSettings();

        // 初始化进度管理
        this.progressManager?.setTotalSteps(3); // 1. 获取DOM, 2. 准备更新, 3. 执行更新
        this.progressManager?.nextStep("取消脚注编号", "正在获取文档DOM...");

        // 1. 获取当前文档的DOM
        const doc = await getBlockDOM(docID);
        if (!doc) {
            return;
        }
        const currentDom = new DOMParser().parseFromString(doc.dom, 'text/html');

        // 存储所有需要批量更新的块
        const allBlocksToUpdate = [];
        // 存储所有独特的脚注内容块ID
        const allFootnoteIds = new Set<string>();
        // 存储受影响的引用块，避免重复处理
        const affectedRefBlocks = new Map<string, HTMLElement>();

        // 2. 准备【引用块】的更新负载
        this.progressManager?.nextStep("取消脚注编号", "正在处理脚注引用...");
        const footnoteRefs = currentDom.querySelectorAll('span[custom-footnote]');

        // 遍历所有引用，修改其文本内容，并记录其所在的块
        footnoteRefs.forEach((ref: HTMLElement) => {
            // 统一将引用文本重置为占位符
            ref.textContent = settings.footnoteBlockref;

            const footnoteId = ref.getAttribute('custom-footnote');
            if (footnoteId) {
                allFootnoteIds.add(footnoteId);
            }

            // 找到包含此引用的块元素
            const containingBlock = ref.closest('[data-node-id]') as HTMLElement;
            if (containingBlock) {
                const blockId = containingBlock.getAttribute('data-node-id');
                if (blockId && !affectedRefBlocks.has(blockId)) {
                    affectedRefBlocks.set(blockId, containingBlock);
                }
            }
        });

        // 将所有需要更新的引用块的DOM数据添加到批量更新数组中
        for (const [blockId, blockElement] of affectedRefBlocks) {
            allBlocksToUpdate.push({
                id: blockId,
                dataType: "dom",
                data: blockElement.outerHTML,
            });
        }

        // 3. 准备【脚注内容块】的更新负载
        if (allFootnoteIds.size > 0) {
            this.progressManager?.setMessage("取消脚注编号", `正在获取 ${allFootnoteIds.size} 个脚注内容块...`);

            // 并行获取所有脚注内容块的DOM
            const footnoteBlockDOMs = await Promise.all(
                Array.from(allFootnoteIds).map(id => getBlockDOM(id).catch(() => null))
            );

            const totalContentBlocks = footnoteBlockDOMs.length;
            let processedContentBlocks = 0;

            for (const footnoteBlockDOM of footnoteBlockDOMs) {
                processedContentBlocks++;
                this.progressManager?.setMessage("取消脚注编号", `正在处理内容块 ${processedContentBlocks}/${totalContentBlocks}...`);

                if (!footnoteBlockDOM?.dom || !footnoteBlockDOM.id) continue;

                // 使用正则表达式将内容块中的索引数字替换为占位符
                const updatedDOM = footnoteBlockDOM.dom.replace(
                    /(<span[^>]*data-type="[^"]*custom-footnote-index[^"]*"[^>]*>)[^<]*(<\/span>)/g,
                    `$1${this.i18n.indexAnchor}$2`
                );

                // 如果DOM内容发生变化，则加入更新列表
                if (updatedDOM !== footnoteBlockDOM.dom) {
                    allBlocksToUpdate.push({
                        id: footnoteBlockDOM.id,
                        dataType: "dom",
                        data: updatedDOM,
                    });
                }
            }
        }

        // 4. 执行统一的批量更新
        if (allBlocksToUpdate.length > 0) {
            this.progressManager?.nextStep("取消脚注编号", `正在批量更新 ${allBlocksToUpdate.length} 个块...`);
            try {
                console.log(`Batch canceling numbering for ${allBlocksToUpdate.length} blocks.`);
                await batchUpdateBlock(allBlocksToUpdate);
            } catch (error) {
                console.error('Failed to batch cancel footnote numbering:', error);
                // 可以添加更详细的错误处理逻辑
            } finally {
            }
        } else {
        }
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
            height: "230px",
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

/**
 * 等待一个块保存的 WebSocket 消息。
 * @param {function|null} filter - 一个可选的过滤函数，用于检查消息。如果函数返回 true，则 promise 被兑现。
 * @param {number} timeout - 超时时间（毫秒），默认为 1000ms。
 * @returns {Promise<any>} - 在收到消息时兑现 (resolve) promise，超时或出错时拒绝 (reject) promise。
 */
function whenBlockSaved(filter = null, timeout = 500) {
    return new Promise((resolve, reject) => {
        const ws = window.siyuan.ws.ws;
        let timeoutId = null;

        // 清理函数，用于移除监听器和定时器
        const cleanup = () => {
            ws.removeEventListener('message', handler);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };

        const handler = (event) => {
            try {
                const msg = JSON.parse(event.data);

                // 检查是否是我们关心的 "transactions" 消息
                if (msg.cmd === "transactions") {
                    // 如果有过滤器，则使用它；否则直接认为是匹配的
                    const isMatch = typeof filter === 'function' ? filter(msg) : true;

                    if (isMatch) {
                        cleanup(); // 成功，清理并兑现
                        resolve(msg);
                    }
                }
            } catch (e) {
                cleanup(); // 出错，清理并拒绝
                reject(e);
            }
        };

        // 设置超时
        timeoutId = setTimeout(() => {
            cleanup(); // 超时，清理并拒绝
            resolve(null)
        }, timeout);

        // 添加事件监听器
        ws.addEventListener('message', handler);
    });
}
