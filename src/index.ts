import { Plugin, fetchSyncPost, Dialog, Protyle } from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, getBlockAttrs, pushMsg, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, createDocWithMd, getDoc, getBlockKramdown, getBlockDOM } from "./api";
import { SettingUtils } from "./libs/setting-utils";
import SettingExample from "@/setting-example.svelte";
import LoadingDialog from "./components/LoadingDialog.svelte";
const STORAGE_NAME = "config";
const zeroWhite = "​"

class FootnoteDialog {
    private dialog: HTMLDialogElement;
    private protyle: Protyle;
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
    constructor(title: string, blockId: string, onSubmit: (content: string) => void, x: number, y: number) {
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

        // Position dialog
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

        // Initialize Protyle
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

        // Add drag event listeners
        const titleBar = this.dialog.querySelector('.dialog-title') as HTMLElement;
        titleBar.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));

        // 添加关闭按钮事件
        this.dialog.querySelector('.close-button').addEventListener('click', () => {
            this.dialog.close();
            this.dialog.remove();
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        });

        // 添加在弹窗外双击关闭弹窗的事件监听
        document.addEventListener('dblclick', this.handleOutsideDoubleClick);

        this.dialog.addEventListener('close', () => {
            this.dialog.remove();
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        });

        this.dialog.show();
    }

    // 处理在弹窗外双击的事件
    private handleOutsideDoubleClick = (event: MouseEvent) => {
        if (!this.dialog.contains(event.target as Node)) {
            this.dialog.close();
            this.dialog.remove();
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        }
    }


    private startDragging(e: MouseEvent) {
        this.isDragging = true;
        const rect = this.dialog.getBoundingClientRect();

        this.initialX = e.clientX - rect.left;
        this.initialY = e.clientY - rect.top;

        this.dialog.style.cursor = 'move';
    }

    private drag(e: MouseEvent) {
        if (!this.isDragging) return;

        e.preventDefault();

        this.currentX = e.clientX - this.initialX;
        this.currentY = e.clientY - this.initialY;

        // Ensure dialog stays within viewport bounds
        const rect = this.dialog.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        this.currentX = Math.min(Math.max(0, this.currentX), viewportWidth - rect.width);
        this.currentY = Math.min(Math.max(0, this.currentY), viewportHeight - rect.height);

        this.dialog.style.left = `${this.currentX}px`;
        this.dialog.style.top = `${this.currentY}px`;
    }

    private stopDragging() {
        this.isDragging = false;
        this.dialog.style.cursor = 'auto';
    }
}

class FootnoteDialog2 {
    private dialog: HTMLDialogElement;
    private content: string;
    private textarea: HTMLTextAreaElement;
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
    constructor(title: string, initialContent: string, onSubmit: (content: string) => void, x: number, y: number) {
        let i18n: typeof this.I18N.zh_CN = window.siyuan.config.lang in this.I18N ? this.I18N[window.siyuan.config.lang] : this.I18N.en_US;

        this.dialog = document.createElement('dialog');
        // this.dialog.classList.add('block__popover');
        this.content = initialContent;
        this.dialog.innerHTML = `
            <div class="dialog-title" style="cursor: move;user-select: none;height: 22px;background-color: var(--b3-theme-background);margin: 0px; border: 1px solid var(--b3-border-color);display: flex;justify-content: space-between;align-items: center;padding: 0 4px;">
                <div style="width: 22px;"></div>
                <div style="font-size: 0.9em;color: var(--b3-theme-on-background);opacity: 0.9;">${i18n.addFootnote}</div>
                <div class="close-button" style="width: 16px;height: 16px;display: flex;align-items: center;justify-content: center;cursor: pointer;color: var(--b3-theme-on-background);">
                    <svg><use xlink:href="#iconClose"></use></svg>
                </div>
            </div>
            <div style="padding: 0 16px; margin-top: 8px">

                <div class="protyle-wysiwyg" style="padding: 0px; margin-bottom: 8px">
                    <div style="border-left: 0.5em solid var(--b3-border-color); color: var(--b3-theme-on-background);padding: 8px; margin-bottom: 8px; background: var(--b3-theme-background);">${title}</div>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="font-weight: bold; margin-bottom: 4px;color: var(--b3-theme-on-background)">${i18n.footnoteContent}:</div>
                    <textarea style="width: 95%; min-height: 100px; padding: 8px; resize: none;background-color: var(--b3-theme-background);color: var(--b3-theme-on-background);"></textarea>
                </div>
            </div>
        `;

        // Position dialog
        this.dialog.style.position = 'fixed';
        this.dialog.style.top = '30%';
        this.dialog.style.left = '40%';
        this.dialog.style.margin = '0';
        this.dialog.style.padding = '0px';
        this.dialog.style.border = '0px solid var(--b3-border-color)';
        this.dialog.style.borderRadius = '4px';
        this.dialog.style.background = 'var(--b3-theme-background)';
        this.dialog.style.boxShadow = 'var(--b3-dialog-shadow)';
        this.dialog.style.resize = 'auto';
        this.dialog.style.width = "500px"
        this.dialog.style.maxHeight = "500px"

        document.body.appendChild(this.dialog);

        this.textarea = this.dialog.querySelector('textarea');
        this.textarea.value = initialContent;
        this.textarea.spellcheck = false;

        // Add drag event listeners
        const titleBar = this.dialog.querySelector('.dialog-title') as HTMLElement;
        titleBar.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));



        this.dialog.addEventListener('close', () => {
            onSubmit(this.textarea.value);
            this.dialog.remove();
            // 移除全局双击事件监听器
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        });

        // 添加在弹窗外双击关闭弹窗的事件监听
        document.addEventListener('dblclick', this.handleOutsideDoubleClick);
        
        // 添加关闭按钮事件
        this.dialog.querySelector('.close-button').addEventListener('click', () => {
            onSubmit(this.textarea.value);
            this.dialog.close();
            this.dialog.remove();
            // 移除全局双击事件监听器
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        });

        this.dialog.showModal();
        this.textarea.focus();
    }

    // 处理在弹窗外双击的事件
    private handleOutsideDoubleClick = (event: MouseEvent) => {
        if (!this.dialog.contains(event.target as Node)) {
            this.dialog.close();
            this.dialog.remove();
            // 移除全局双击事件监听器
            document.removeEventListener('dblclick', this.handleOutsideDoubleClick);
        }
    }

    private startDragging(e: MouseEvent) {
        this.isDragging = true;
        const rect = this.dialog.getBoundingClientRect();

        this.initialX = e.clientX - rect.left;
        this.initialY = e.clientY - rect.top;

        this.dialog.style.cursor = 'move';
    }

    private drag(e: MouseEvent) {
        if (!this.isDragging) return;

        e.preventDefault();

        this.currentX = e.clientX - this.initialX;
        this.currentY = e.clientY - this.initialY;

        // Ensure dialog stays within viewport bounds
        const rect = this.dialog.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        this.currentX = Math.min(Math.max(0, this.currentX), viewportWidth - rect.width);
        this.currentY = Math.min(Math.max(0, this.currentY), viewportHeight - rect.height);

        this.dialog.style.left = `${this.currentX}px`;
        this.dialog.style.top = `${this.currentY}px`;
    }

    private stopDragging() {
        this.isDragging = false;
        this.dialog.style.cursor = 'auto';
    }
}
export default class PluginFootnote extends Plugin {

    // private isMobile: boolean;
    private settingUtils: SettingUtils;
    private styleElement: HTMLStyleElement;
    private loadingDialog: Dialog;

    private readonly STYLES = `/* 自定义脚注引用样式 */
.protyle-wysiwyg [data-node-id] span[custom-footnote],
.protyle-wysiwyg [data-node-id] span[data-type*="block-ref"][custom-footnote],
.protyle-wysiwyg [data-node-id] span[data-ref*="siyuan://blocks"][custom-footnote] {
    background-color: var(--b3-font-background5) !important;
    color: var(--b3-theme-on-background) !important;
    border: none !important;
    margin: 0 1px;
    border-radius: 3px;
}
/* 自定义选中文本样式 */
.protyle-wysiwyg [data-node-id] span[data-type*="custom-footnote-selected-text"] {
    border-bottom: 2px dashed var(--b3-font-color5);
}
/* 导出pdf脚注引用为上标样式 */
.b3-typography a[custom-footnote],
#preview .protyle-wysiwyg a[custom-footnote] {
    top: -0.5em;
    font-size: 75%;
    line-height: 0;
    vertical-align: baseline;
    position: relative;
}

/* 自定义脚注内容块样式 */
/* 脚注内容块如果设置为横排超级块则减少间距 */
.protyle-wysiwyg .sb[custom-plugin-footnote-content][data-sb-layout="col"] {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    column-gap: 0em;
}
/* 脚注内容块设置字体样式 */
/*.protyle-wysiwyg [data-node-id][custom-plugin-footnote-content] {
    font-size: 0.8em;
    color: var(--b3-font-color5);
}*/
`;
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


    private getDefaultSettings() {
        return {
            saveLocation: '1',
            footnoteContainerTitle: this.i18n.settings.footnoteContainerTitle.value,
            docID: "",
            footnoteContainerTitle2: this.i18n.settings.footnoteContainerTitle2.value,
            footnoteContainerTitle3: this.i18n.settings.footnoteContainerTitle3.value,
            updateFootnoteContainerTitle: true,
            order: '1',
            footnoteRefStyle: '1',
            footnoteBlockref: this.i18n.settings.footnoteBlockref.value,
            selectFontStyle: '1',
            templates: `{{{col
\${index}
{: style="width: 2.5em; flex: 0 0 auto;"}

{{{row
> \${selection}

\${content}
}}}
}}}
`,
            enableOrderedFootnotes: false, // Add new setting
            footnoteAlias: '',
            css: this.STYLES,
            floatDialogEnable: true
        };
    }
    updateCSS(css: string) {
        this.styleElement.textContent = css;

    }
    async onload() {

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
        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
        });

        // 添加自定义图标
        this.addIcons(`<symbol id="iconFootnote"  viewBox="0 0 32 32">
  <path d="M1.42,26.38V4.85h6.57v2.53h-3.05v16.46h3.05v2.53H1.42Z" />
  <path d="M19.12,21.65h-3.71v-12.13c-1.35,1.1-2.95,1.91-4.79,2.44v-2.92c.97-.27,2.02-.8,3.15-1.56s1.91-1.66,2.33-2.69h3.01v16.86Z" />
  <path d="M30.58,4.85v21.53h-6.57v-2.53h3.05V7.36h-3.05v-2.51h6.57Z" />
</symbol>`);

        /*
          通过 type 自动指定 action 元素类型； value 填写默认值
        */

        // Container Settings Group
        this.settingUtils.addItem({
            type: 'hint',
            key: 'containerGroup',
            value: '',
            title: this.i18n.settings.groups?.container || 'Container Settings',
            class: ""
        });

        this.settingUtils.addItem({
            key: "saveLocation",
            value: '1',
            type: "select",
            title: this.i18n.settings.saveLocation.title,
            description: this.i18n.settings.saveLocation.description,
            options: {
                1: this.i18n.settings.saveLocation.current,
                2: this.i18n.settings.saveLocation.specified,
                3: this.i18n.settings.saveLocation.childDoc,
                4: this.i18n.settings.saveLocation.afterParent
            }
        });


        this.settingUtils.addItem({
            key: "footnoteContainerTitle",
            value: this.i18n.settings.footnoteContainerTitle.value,
            type: "textinput",
            title: this.i18n.settings.footnoteContainerTitle.title,
            description: this.i18n.settings.footnoteContainerTitle.description,
        });
        this.settingUtils.addItem({
            key: "docID",
            value: "",
            type: "textinput",
            title: this.i18n.settings.docId.title,
            description: this.i18n.settings.docId.description,
        });

        this.settingUtils.addItem({
            key: "footnoteContainerTitle2",
            value: this.i18n.settings.footnoteContainerTitle2.value,
            type: "textinput",
            title: this.i18n.settings.footnoteContainerTitle2.title,
            description: this.i18n.settings.footnoteContainerTitle2.description,
        });

        this.settingUtils.addItem({
            key: "footnoteContainerTitle3",
            value: this.i18n.settings.footnoteContainerTitle3.value,
            type: "textinput",
            title: this.i18n.settings.footnoteContainerTitle3.title,
            description: this.i18n.settings.footnoteContainerTitle3.description,
        });

        this.settingUtils.addItem({
            key: "updateFootnoteContainerTitle",
            value: true,
            type: "checkbox",
            title: this.i18n.settings.updateFootnoteContainerTitle.title,
            description: this.i18n.settings.updateFootnoteContainerTitle.description,
        });
        this.settingUtils.addItem({
            key: "order",
            value: '1',
            type: "select",
            title: this.i18n.settings.order.title,
            description: this.i18n.settings.order.description,
            options: {
                1: this.i18n.settings.order.asc,
                2: this.i18n.settings.order.desc,
            }
        });

        // Style Settings Group
        this.settingUtils.addItem({
            type: 'hint',
            key: 'styleGroup',
            value: '',
            title: this.i18n.settings.groups?.style || 'Style Settings',
            class: 'fn__flex-center config-group-header'
        });

        this.settingUtils.addItem({
            key: "footnoteRefStyle",
            value: '1',
            type: "select",
            title: this.i18n.settings.footnoteRefStyle.title,
            description: this.i18n.settings.footnoteRefStyle.description,
            options: {
                1: this.i18n.settings.footnoteRefStyle.ref,
                2: this.i18n.settings.footnoteRefStyle.link,
            }
        });

        this.settingUtils.addItem({
            key: "footnoteBlockref",
            value: this.i18n.settings.footnoteBlockref.value,
            type: "textinput",
            title: this.i18n.settings.footnoteBlockref.title,
            description: this.i18n.settings.footnoteBlockref.description,
        });
        // Add ordered footnotes setting
        this.settingUtils.addItem({
            key: "enableOrderedFootnotes",
            value: false,
            type: "checkbox",
            title: this.i18n.settings.enableOrderedFootnotes.title,
            description: this.i18n.settings.enableOrderedFootnotes.description,
        });
        this.settingUtils.addItem({
            key: "selectFontStyle",
            value: '1',
            type: "select",
            title: this.i18n.settings.selectFontStyle.title,
            description: this.i18n.settings.selectFontStyle.description,
            options: {
                1: this.i18n.settings.selectFontStyle.none,
                2: this.i18n.settings.selectFontStyle.custom
            }
        });
        this.settingUtils.addItem({
            key: "floatDialogEnable",
            value: true,
            type: "checkbox",
            title: this.i18n.settings.floatDialog.title,
            description: this.i18n.settings.floatDialog.description,
        });

        this.settingUtils.addItem({
            key: "templates",
            value: this.getDefaultSettings().templates,
            type: "textarea",
            title: this.i18n.settings.template.title,
            description: this.i18n.settings.template.description,
        });

        // Add after other style settings
        this.settingUtils.addItem({
            key: "footnoteAlias",
            value: this.i18n.settings.footnoteAlias.value,
            type: "textinput",
            title: this.i18n.settings.footnoteAlias.title,
            description: this.i18n.settings.footnoteAlias.description,
        });
        // Add CSS setting
        this.settingUtils.addItem({
            key: "css",
            value: this.STYLES,
            type: "textarea",
            title: this.i18n.settings.css.title,
            description: this.i18n.settings.css.description,
            action: {
                callback: () => {
                    const newCSS = this.settingUtils.take('css');
                    this.updateCSS(newCSS);
                }
            }
        });
        // Reset Settings Button
        this.settingUtils.addItem({
            key: "resetConfig",
            value: "",
            type: "button",
            title: this.i18n.settings.reset?.title || "Reset Settings",
            description: this.i18n.settings.reset?.description || "Reset all settings to default values",
            button: {
                label: this.i18n.settings.reset?.label || "Reset",
                callback: async () => {
                    // if (confirm(this.i18n.settings.reset.confirm)) {
                    const defaultSettings = this.getDefaultSettings();
                    // Update each setting item's value and UI element  只是UI改了，json的值没有改
                    for (const [key, value] of Object.entries(defaultSettings)) {
                        await this.settingUtils.set(key, value);
                    }
                    // Update the UI
                    this.updateCSS(this.settingUtils.get("css"));

                }
            }
        });

        await this.settingUtils.load(); //导入配置并合并


        this.eventBus.on("open-menu-blockref", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
        this.eventBus.on("open-menu-link", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind


        // Create style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'snippetCSS-Footnote';
        document.head.appendChild(this.styleElement);
        this.updateCSS(this.settingUtils.get("css"));
    }

    onLayoutReady() {
    }

    onunload() {
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
                    if (this.settingUtils.get("enableOrderedFootnotes")) {
                        // 获取docID
                        const docID = detail.protyle.block.rootID;
                        if (docID) {
                            // Wait a bit for DOM updates
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await this.reorderFootnotes(docID, false);
                        }
                    }
                }
            });
        }
    }

    private async addMemoBlock(protyle: IProtyle) {
        await this.settingUtils.load(); //导入配置
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
        switch (this.settingUtils.get("saveLocation")) {
            case '1':
                footnoteContainerTitle = this.settingUtils.get("footnoteContainerTitle").replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                // if (!footnoteContainerTitle.startsWith("#")) {
                //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                // }
                break;
            case '2':
                footnoteContainerTitle = this.settingUtils.get("footnoteContainerTitle2").replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                // if (!footnoteContainerTitle.startsWith("#")) {
                //     footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                // }
                break;
            case '3':
                footnoteContainerTitle = this.settingUtils.get("footnoteContainerTitle3").replace(/\$\{filename\}/g, currentDocTitle);
                break;
        }
        // 处理文档 ID 和脚注容器 ID
        let docID;
        let footnoteContainerID: string;
        let query_res;
        switch (this.settingUtils.get("saveLocation")) {
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
                    if (this.settingUtils.get("updateFootnoteContainerTitle")) {
                        await updateBlock("markdown", `${footnoteContainerTitle}`, footnoteContainerID);
                    }
                }

                await setBlockAttrs(footnoteContainerID, {
                    "custom-plugin-footnote-parent": protyle.block.rootID
                });
                break;

            case '2': // 指定文档
                docID = this.settingUtils.get("docID");
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
                    if (this.settingUtils.get("updateFootnoteContainerTitle")) {
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
                    if (this.settingUtils.get("updateFootnoteContainerTitle")) {
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
        let templates = this.settingUtils.get("templates");
        templates = templates.replace(/\$\{selection\}/g, cleanSelection);
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
        // 如果this.settingUtils.get("saveLocation")不等于4，则按照设置来插入，否则直接在父块后插入
        if (this.settingUtils.get("saveLocation") == '4') {
            switch (this.settingUtils.get("order")) {
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
            switch (this.settingUtils.get("order")) {
                case '2':
                    // 倒序
                    if (this.settingUtils.get("saveLocation") != 3) {
                        back = await appendBlock("markdown", templates, footnoteContainerID);
                    } else {
                        back = await prependBlock("markdown", templates, footnoteContainerID);
                    }
                    break;
                case '1':
                default:
                    if (this.settingUtils.get("saveLocation") != 3) {

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
        await setBlockAttrs(newBlockId, { "alias": this.settingUtils.get("footnoteAlias") });

        // 选中的文本添加样式
        let range = protyle.toolbar.range;
        if (this.settingUtils.get("selectFontStyle") === '2') {
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


        switch (this.settingUtils.get("footnoteRefStyle")) {
            case '2':
                // 插入块链接
                protyle.toolbar.setInlineMark(protyle, "a sup", "range", {
                    type: "a",
                    color: `${"siyuan://blocks/" + newBlockId + zeroWhite + this.settingUtils.get("footnoteBlockref")}`
                });
                memoELement = protyle.element.querySelector(`span[data-href="siyuan://blocks/${newBlockId}"]`);
                break;
            default:
                // 插入块引
                protyle.toolbar.setInlineMark(protyle, "block-ref sup", "range", {
                    type: "id",
                    color: `${newBlockId + zeroWhite + "s" + zeroWhite + this.settingUtils.get("footnoteBlockref")}`
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

        if (this.settingUtils.get("enableOrderedFootnotes")) {
            if (this.settingUtils.get("floatDialogEnable")) {
                // Instead of showing float layer, show dialog
                new FootnoteDialog2(
                    cleanSelection,
                    '',
                    async (content) => {
                        // TODO: 如果关的时候恰好内容块在刷新，编号可能会获取不到
                        // Get existing block attributes before update

                        // 获取脚注内容块的内容
                        const originDOM = (await getBlockDOM(newBlockId)).dom;

                        // DOM是string，使用正则表达式检测是否span[data - type*= "custom-footnote-index"]节点，如果有则提取其[number]中的数字
                        let number = 1;
                        if (originDOM) {
                            // 使用 .*? 来匹配 data-type 中任意的前缀值
                            const match = originDOM.match(/<span data-type=".*?custom-footnote-index[^>]*>\[(\d+)\]<\/span>/);
                            if (match) {
                                number = parseInt(match[1]);
                            }
                        }

                        // 
                        // 把content的多余空行去除
                        content = content.replace(/(\r\n|\n|\r){2,}/g, '\n');

                        // Update the footnote content
                        const templates = this.settingUtils.get("templates")
                            .replace(/\$\{selection\}/g, cleanSelection)
                            .replace(/\$\{selection:text\}/g, selectionText)
                            .replace(/\$\{content\}/g, content)
                            .replace(/\$\{refID\}/g, currentBlockId)
                            .replace(/\$\{index\}/g, `<span data-type="custom-footnote-index a" data-href="siyuan://blocks/${currentBlockId}">[${number}]</span>`) // 支持添加脚注编号
                            .replace(/\$\{index:text\}/g, `<span data-type="custom-footnote-index">[${number}]</span>`); // 支持添加脚注编号

                        const renderedTemplate = await renderTemplates(templates);

                        // Update block content
                        const existingAttrs = await getBlockAttrs(newBlockId);
                        await updateBlock("markdown", renderedTemplate, newBlockId);
                        // Restore block attributes that could have been reset by updateBlock

                        if (existingAttrs) {
                            await setBlockAttrs(newBlockId, {
                                "custom-plugin-footnote-content": existingAttrs["custom-plugin-footnote-content"],
                                // "name": existingAttrs["name"],
                                "alias": existingAttrs["alias"]
                            });
                        }
                    },
                    x,
                    y + 20 // Position below cursor
                );
            }
            // 等500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            if (this.settingUtils.get("saveLocation") == 4) {
                //脚注内容块放在块后，不进行脚注内容块排序
                await this.reorderFootnotes(protyle.block.rootID, false);
            } else {
                await this.reorderFootnotes(protyle.block.rootID, true);
            }
        } else {
            if (this.settingUtils.get("floatDialogEnable")) {
                // Instead of showing float layer, show dialog
                new FootnoteDialog(
                    cleanSelection,
                    newBlockId,
                    null, // onSubmit is no longer needed since changes are saved automatically via Protyle
                    x,
                    y + 20
                );
            }
        }
    }

    // Add new function to reorder footnotes
    private async reorderFootnotes(docID: string, reorderBlocks: boolean, protyle?: any) {
        
        // Get current document DOM
        let currentDom;
        if (protyle) {
            currentDom = protyle.wysiwyg.element;
        } else {
            const doc = await getDoc(docID);
            if (!doc) return;
            currentDom = new DOMParser().parseFromString(doc.content, 'text/html');
        }

        // Determine target document based on save location setting
        let footnoteContainerDocID = docID;
        let footnoteContainerDom = currentDom;

        switch (this.settingUtils.get("saveLocation")) {
            case '2': // Specified document
                footnoteContainerDocID = this.settingUtils.get("docID");
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

        // Only fetch and parse target document if different from current
        if (footnoteContainerDocID !== docID) {
            const targetDoc = await getDoc(footnoteContainerDocID);
            if (!targetDoc) return;
            footnoteContainerDom = new DOMParser().parseFromString(targetDoc.content, 'text/html');
        }

        let counter = 1;
        const footnoteOrder = new Map();

        // Parse current document to get reference order
        const blockRefs = currentDom.querySelectorAll('span[custom-footnote]');
        blockRefs.forEach((ref) => {
            const footnoteId = ref.getAttribute('custom-footnote');
            if (footnoteId && !footnoteOrder.has(footnoteId)) {
                footnoteOrder.set(footnoteId, counter++);
            }
        });

        // Update reference numbers in current document
        blockRefs.forEach((ref) => {
            const footnoteId = ref.getAttribute('custom-footnote');
            if (footnoteId) {
                const number = footnoteOrder.get(footnoteId);
                ref.textContent = `[${number}]`;
            }
        });

        // Reorder footnote blocks if needed
        // 获取脚注块并更新编号
        const footnoteBlocks = Array.from(footnoteContainerDom.querySelectorAll(`[custom-plugin-footnote-content="${docID}"]`));
        if (footnoteBlocks.length > 0) {
            footnoteBlocks.forEach(block => {
                // 获取脚注块的ID
                const blockId = block.getAttribute('data-node-id');
                if (blockId) {
                    // 获取该块对应的编号
                    const number = footnoteOrder.get(blockId);
                    if (number) {
                        // 查找并更新块内的索引编号元素
                        const indexSpan = block.querySelector('span[data-type*="custom-footnote-index"]');
                        if (indexSpan) {
                            indexSpan.textContent = `[${number}]`;
                        }
                    }
                }
            });

            // 如果需要重排序
            if (reorderBlocks) {
                const parent = footnoteBlocks[0].parentNode;
                if (parent) {
                    let referenceNode = footnoteBlocks[0].previousSibling;
                    footnoteBlocks.forEach(block => block.remove());

                    // 排序并重新插入块
                    footnoteBlocks
                        .sort((a, b) => {
                            const aId = a.getAttribute('data-node-id');
                            const bId = b.getAttribute('data-node-id');
                            const aOrder = footnoteOrder.get(aId) || Infinity;
                            const bOrder = footnoteOrder.get(bId) || Infinity;
                            return aOrder - bOrder;
                        })
                        .forEach(block => {
                            if (referenceNode) {
                                referenceNode.after(block);
                                referenceNode = block;
                            } else {
                                parent.insertBefore(block, parent.firstChild);
                            }
                        });
                }
            }
        }
        // Save changes
        if (protyle) {
            // 应该获取protyle.wysiwyg.element.innerHTML
            await updateBlock("dom", protyle.wysiwyg.element.innerHTML, docID);
            // saveViaTransaction(protyle.wysiwyg.element) // 保存不了排序的

        } else {
            await updateBlock("dom", currentDom.body.innerHTML, docID);
        }
        if (footnoteContainerDocID !== docID) {
            await updateBlock("dom", footnoteContainerDom.body.innerHTML, footnoteContainerDocID);
        }
    }

    private async cancelReorderFootnotes(docID: string, reorderBlocks: boolean) {
        // Get current document DOM
        const doc = await getDoc(docID);
        if (!doc) return;
        const currentDom = new DOMParser().parseFromString(doc.content, 'text/html');

        // Get default footnote reference format
        const defaultAnchor = this.settingUtils.get("footnoteBlockref");

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
    // async openSetting() {
    //     // Load settings before opening dialog
    //     await this.settingUtils.load();
        
    //     let dialog = new Dialog({
    //         title: "SettingPannel",
    //         content: `<div id="SettingPanel" style="height: 100%;"></div>`,
    //         width: "800px",
    //         destroyCallback: (options) => {
    //             console.log("destroyCallback", options);
    //             pannel.$destroy();
    //         }
    //     });
        
    //     let pannel = new SettingExample({
    //         target: dialog.element.querySelector("#SettingPanel"),
    //         props: { 
    //             i18n: this.i18n,
    //             plugin: this
    //         }
    //     });
    // }
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
