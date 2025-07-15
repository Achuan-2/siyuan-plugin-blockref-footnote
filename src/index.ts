import { Plugin, fetchSyncPost, Dialog, Protyle } from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, getBlockAttrs, pushMsg, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, moveBlock, createDocWithMd, getDoc, getBlockKramdown, getBlockDOM, batchUpdateBlock } from "./api";
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
        this.dialog.style.zIndex = '2';
        this.dialog.style.width = "500px"
        this.dialog.style.maxHeight = "500px"
        document.body.appendChild(this.dialog);

        // --- 初始化 Protyle 编辑器 ---
        const protyleContainer = this.dialog.querySelector('#footnote-protyle-container');
        this.protyle = new Protyle(window.siyuan.ws.app, protyleContainer as HTMLElement, {
            blockId: blockId,
            mode: "wysiwyg",
            action: ['cb-get-focus'],
            render: {
                breadcrumb: true,
                background: false,
                title: false,
                gutter: true,
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
        this.dialog.addEventListener('keydown', this.handleKeyDown,true);

        // 4. 全局监听器现在只负责拖动和外部点击
        document.addEventListener('dblclick', this.handleOutsideDoubleClick);
        const titleBar = this.dialog.querySelector('.dialog-title') as HTMLElement;
        titleBar.addEventListener('mousedown', this.startDragging);
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.stopDragging);

        this.dialog.show();

        // 确保 protyle 获得焦点，这样键盘事件才能被 dialog 捕获
        this.protyle.focus();
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


export default class PluginFootnote extends Plugin {

    // private isMobile: boolean;
    private settingUtils: SettingUtils;
    private styleElement: HTMLStyleElement;
    private loadingDialog: Dialog;
    private footnoteDock: any;
    private footnoteDockElement: HTMLElement;


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
                    await pushMsg(this.i18n.reorderFootnotes + " Finished");
                }
            },
            editorCallback: async (protyle: any) => {
                if (protyle.block?.rootID) {
                    this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                    await this.reorderFootnotes(protyle.block.rootID, true);
                    this.closeLoadingDialog();
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
                    await pushMsg(this.i18n.cancelReorderFootnotes + " Finished");
                }
            },
            editorCallback: async (protyle: any) => {
                if (protyle.block?.rootID) {
                    this.showLoadingDialog(this.i18n.cancelReorderFootnotes + " ...");
                    await this.reorderFootnotes(protyle.block.rootID, true);
                    this.closeLoadingDialog();
                    await pushMsg(this.i18n.cancelReorderFootnotes + " Finished");
                }
            },
        });

        this.addCommand({
            langKey: "hideFootnoteSelection",
            langText: this.i18n.hideFootnoteSelection,
            hotkey: "",
            callback: async () => {
                // Get the current doc ID from protyle
                this.showLoadingDialog(this.i18n.hideFootnoteSelection + " ...");
                const docId = this.getDocumentId();
                console.log(docId)
                if (!docId) return;

                // Get the full DOM
                const docResp = await getBlockDOM(docId);
                if (!docResp) return;

                // Parse the DOM and replace hidden classes
                let newDom = docResp.dom;
                newDom = newDom.replace(
                    /(<span\b[^>]*?\bdata-type=")custom-footnote-selected-text-([^"]*)"/g,
                    '$1custom-footnote-hidden-selected-text-$2"'
                );

                // Update the document with modified DOM
                await updateBlock("dom", newDom, docId);
                this.closeLoadingDialog();
                await pushMsg(this.i18n.hideFootnoteSelection + " Finished");
            }
        });
        this.addCommand({
            langKey: "showFootnoteSelection",
            langText: this.i18n.showFootnoteSelection,
            hotkey: "",
            callback: async () => {
                // Get the current doc ID from protyle
                const docId = this.getDocumentId();
                console.log(docId)
                if (!docId) return;
                this.showLoadingDialog(this.i18n.showFootnoteSelection + " ...");
                // Get the full DOM
                const docResp = await getBlockDOM(docId);
                if (!docResp) return;

                // Parse the DOM and replace hidden classes
                let newDom = docResp.dom;
                newDom = newDom.replace(
                    /(<span\b[^>]*?\bdata-type=")custom-footnote-hidden-selected-text-([^"]*)"/g,
                    '$1custom-footnote-selected-text-$2"'
                );

                // Update the document with modified DOM
                await updateBlock("dom", newDom, docId);
                this.closeLoadingDialog();
                await pushMsg(this.i18n.showFootnoteSelection + " Finished!");
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


        // Create style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'snippetCSS-Footnote';
        document.head.appendChild(this.styleElement);
        const settings = await this.loadSettings();
        this.updateCSS(settings.css);

        // 初始化脚注Dock栏
        await this.initFootnoteDock();
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
                    // Get current document ID and reorder footnotes if enabled
                    const settings = await this.loadSettings();
                    if (settings.enableOrderedFootnotes) {
                        // 获取docID
                        const docID = detail.protyle.block.rootID;
                        if (docID) {
                            // Wait a bit for DOM updates
                            await new Promise(resolve => setTimeout(resolve, 500));
                            this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                            await this.reorderFootnotes(docID, false);
                            this.closeLoadingDialog();
                            await pushMsg(this.i18n.reorderFootnotes + " Finished");
                        }
                    }
                }
            });
        }
    }

    private async addMemoBlock(protyle: IProtyle) {
        const settings = await this.loadSettings();
        // console.log(protyle.block.rootID);
        // 获取当前光标所在块的 ID
        const currentBlockId = protyle.toolbar.range.startContainer.parentElement.closest('[data-node-id]')?.getAttribute('data-node-id');
        const currentParentBlockId = protyle.toolbar.range.startContainer.parentElement.closest('.protyle-wysiwyg > [data-node-id]')?.getAttribute('data-node-id');
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
            case '1':
                footnoteContainerTitle = settings.footnoteContainerTitle.replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                // if (!footnoteContainerTitle.startsWith("#")) {
                //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                // }
                break;
            case '2':
                footnoteContainerTitle = settings.footnoteContainerTitle2.replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                // if (!footnoteContainerTitle.startsWith("#")) {
                //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                // }
                break;
            case '3':
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

            case '2': // 指定文档
                docID = settings.docID;
                if (!docID) {
                    pushErrMsg(this.i18n.errors.noDocId);
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

        // 选中的文本添加样式
        let range = protyle.toolbar.range;
        if (settings.selectFontStyle === '2') {
            protyle.toolbar.setInlineMark(protyle, `custom-footnote-selected-text-${newBlockId}`, "range");
        } else {
            protyle.toolbar.setInlineMark(protyle, `custom-footnote-hidden-selected-text-${newBlockId}`, "range");
        }

        // --------------------------添加脚注引用 -------------------------- // 

        protyle.toolbar.range = range;
        const { x, y } = protyle.toolbar.range.getClientRects()[0]

        // 将range的起始点和结束点都移动到选中文本的末尾
        range.collapse(false); // false 表示将光标移动到选中文本的末尾

        // 需要先清除样式，避免带上选中文本的样式
        try {
            protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
        } catch (e) {
        }


        // 添加块引，同时添加上标样式
        // protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
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



        protyle.toolbar.element.classList.add("fn__none")

        // 等待保存数据
        await whenBlockSaved().then(async (msg) => {console.log("saved") });

        if (settings.enableOrderedFootnotes) {
            if (settings.floatDialogEnable) {
                // Instead of showing float layer, show dialog
                new FootnoteDialog(
                    cleanSelection,
                    newBlockId,
                    async () => {
                        // 等500ms
                        this.showLoadingDialog(this.i18n.reorderFootnotes + " ...")
                        if (settings.saveLocation == 4) {
                            //脚注内容块放在块后，不进行脚注内容块排序
                            await this.reorderFootnotes(protyle.block.rootID, false);

                        } else {

                            await this.reorderFootnotes(protyle.block.rootID, true);
                        }
                        this.closeLoadingDialog();
                        await pushMsg(this.i18n.reorderFootnotes + " Finished");

                    },
                    x,
                    y + 20 // Position below cursor
                );
            }


        } else {
            if (settings.floatDialogEnable) {
                // Instead of showing float layer, show dialog
                new FootnoteDialog(
                    cleanSelection,
                    newBlockId,
                    async () => { }, 
                    x,
                    y + 20
                );
                // console.log(Dialog.protyle);


            }
        }
    }

    // Add new function to reorder footnotes
    private async reorderFootnotes(docID: string, reorderBlocks: boolean, protyle?: any) {
        const settings = await this.loadSettings();
        // Get current document DOM
        let currentDom;
        if (protyle) {
            currentDom = protyle.wysiwyg.element;
        } else {
            const doc = await getBlockDOM(docID);
            if (!doc) return;
            currentDom = new DOMParser().parseFromString(doc.dom, 'text/html');
        }


        // 确定脚注容器文档ID
        let footnoteContainerDocID = docID;
        switch (settings.saveLocation) {
            case '2': // Specified document
                footnoteContainerDocID = settings.docID;
                if (!footnoteContainerDocID) return;
                break;
            case '3': // Child document
                const childDoc = await sql(
                    `SELECT * FROM blocks WHERE type='d' AND ial like '%custom-plugin-footnote-parent="${docID}"%' LIMIT 1`
                );
                if (childDoc?.length > 0) {
                    footnoteContainerDocID = childDoc[0].id;
                }
                break;
        }

        // 查找所有脚注引用元素，按文档顺序建立映射 (这部分逻辑保持不变)
        const footnoteRefs = currentDom.querySelectorAll('[custom-footnote]');
        const footnoteOrder = new Map<string, number>();
        const processedIds = new Set<string>();
        let counter = 1;

        // 按顺序处理每个脚注引用
        for (const ref of footnoteRefs) {
            const footnoteId = ref.getAttribute('custom-footnote');

            // 跳过已处理的脚注ID，但仍然更新引用编号
            if (!processedIds.has(footnoteId)) {
                footnoteOrder.set(footnoteId, counter);
                processedIds.add(footnoteId);
                counter++;
            }

            // 更新引用编号显示
            const currentNumber = footnoteOrder.get(footnoteId);
            if (currentNumber) {
                ref.textContent = `[${currentNumber}]`;
            }
        }

        // 保存当前文档的更改（引用编号）
        if (protyle) {
            await updateBlock("dom", protyle.wysiwyg.element.innerHTML, docID);
        } else {
            await updateBlock("dom", currentDom.body.innerHTML, docID);
        }

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

                        for (const targetId of targetOrderIds) {
                            // 检查当前目标块是否是LCS的一部分（即是否是稳定锚点）
                            if (lcsIndex < lcsIds.length && targetId === lcsIds[lcsIndex]) {
                                // 是稳定块，不移动它，只更新锚点
                                previousID = targetId;
                                lcsIndex++;
                            } else {
                                // 是需要移动的块
                                try {
                                    // console.log(`Moving ${targetId} after ${previousID}`);
                                    await moveBlock(targetId, previousID, containerId);
                                    // 移动后，它成为新的锚点
                                    previousID = targetId;
                                } catch (error) {
                                    console.warn('Failed to move block:', targetId, error);
                                }
                            }
                        }
                    } else {
                        console.log('Footnote blocks are already in the correct order. No move operation is needed.');
                    }
                }
            }
        }

        // 更新脚注内容块中的索引编号
        // **改进点**: 准备一个数组来收集所有需要更新的脚注内容块
        const blocksToUpdate = [];

        // 定义用于精确提取索引编号的正则表达式
        const numberExtractionRegex = /<span[^>]*data-type="[^"]*custom-footnote-index[^"]*"[^>]*>\[(\d+)\]<\/span>/;

        for (const [footnoteId, newNumber] of footnoteOrder) {
            try {
                const footnoteBlockDOM = await getBlockDOM(footnoteId);
                if (!footnoteBlockDOM?.dom) {
                    continue; // 如果无法获取DOM，则跳过
            }
                const originalDOM = footnoteBlockDOM.dom;

                // 1. 从DOM中精确提取当前的索引编号
            const match = numberExtractionRegex.exec(originalDOM);
                // 2. 检查当前编号是否已经正确
                // 如果在DOM中找到了编号，并且它与新编号相同，则无需更新，直接跳到下一个
                if (match && match[1] && parseInt(match[1], 10) == newNumber) {
                    continue;
                }

                // 3. 如果编号不正确或未找到（说明块格式需修复），则生成新DOM并加入更新队列
            const updatedDOM = originalDOM.replace(
                /(<span[^>]*data-type="[^"]*custom-footnote-index[^"]*"[^>]*>)\[[^\]]*\](<\/span>)/g,
                `$1[${newNumber}]$2`
            );

                blocksToUpdate.push({
                    id: footnoteId,
                    dataType: "dom",
                    data: updatedDOM,
                });

            } catch (error) {
                console.warn(`Failed to process footnote content block ${footnoteId}:`, error);
            }
        }

        if (blocksToUpdate.length > 0) {
            try {
                // console.log(`Batch updating ${blocksToUpdate.length} footnote indices that require changes.`);
                await batchUpdateBlock(blocksToUpdate);
            } catch (error) {
                console.error('Failed to batch update footnote indices:', error);
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

    private async cancelReorderFootnotes(docID: string, reorderBlocks: boolean) {
        const settings = await this.loadSettings();
        // Get current document DOM
        const doc = await getBlockDOM(docID);
        if (!doc) return;
        const currentDom = new DOMParser().parseFromString(doc.dom, 'text/html');

        // Get default footnote reference format
        const defaultAnchor = settings.footnoteBlockref;

        // Reset all footnote references
        const footnoteRefs = currentDom.querySelectorAll('span[custom-footnote]');
        const footnoteIds = new Set<string>();
        footnoteRefs.forEach((ref) => {
            ref.textContent = defaultAnchor;
            const footnoteId = ref.getAttribute('custom-footnote');
            if (footnoteId && !footnoteIds.has(footnoteId)) {
                footnoteIds.add(footnoteId);
            }
        });
        // update dom
        await updateBlock("dom", currentDom.body.innerHTML, docID);

        // Update footnote blocks
        await Promise.all(
            Array.from(footnoteIds).map(async footnoteId => {
                let footnoteBlock = (await getBlockDOM(footnoteId)).dom;
                if (footnoteBlock) {
                    footnoteBlock = footnoteBlock.replace(/(<span data-type=".*?custom-footnote-index[^>]*>)[^<]*(<\/span>)/g, "$1" + this.i18n.indexAnchor + "$2");
                    updateBlock("dom", footnoteBlock, footnoteId);
                }
                // return setBlockAttrs(footnoteId, { "name": "" });
            })
        );

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
            width: "300px",
            height: "150px",
            disableClose: true, // 禁止点击外部关闭
            destroyCallback: null // 禁止自动关闭
        });
        new LoadingDialog({
            target: this.loadingDialog.element.querySelector('#loadingDialogContent'),
            props: { message }
        });
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