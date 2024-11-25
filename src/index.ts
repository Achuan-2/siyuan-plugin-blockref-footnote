import {
    Plugin,
    // getFrontend,
    Protyle
} from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, createDocWithMd, getBlockKramdown } from "./api";
import { SettingUtils } from "./libs/setting-utils";

const STORAGE_NAME = "config";
const zeroWhite = "​"



export default class PluginFootnote extends Plugin {

    // private isMobile: boolean;
    private settingUtils: SettingUtils;
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
            templates: `{{{row
> \${selection} [[↩️]](siyuan://blocks/\${refID})

\${content}
}}}
{: style="border: 2px dashed var(--b3-border-color);"}}`,
            enableOrderedFootnotes: false, // Add new setting
            footnoteAlias: 'footnote',
        };
    }

    async onload() {
        // 注册快捷键
        this.addCommand({
            langKey: this.i18n.tips,
            hotkey: "⇧⌘F",
            callback: () => {
            },
            editorCallback: (protyle: any) => {
                this.protyle = protyle;
                this.addMemoBlock(this.protyle);
            },

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
        // this.settingUtils.addItem({
        //     key: "enableOrderedFootnotes",
        //     value: false,
        //     type: "checkbox",
        //     title: this.i18n.settings.enableOrderedFootnotes.title,
        //     description: this.i18n.settings.enableOrderedFootnotes.description,
        // });
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
            key: "templates",
            value: `{{{row
> \${selection} [[↩️]](siyuan://blocks/\${refID})

\${content}
}}}
{: style="border: 2px dashed var(--b3-border-color);"}}`,
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

        // Reset Settings Button
        this.settingUtils.addItem({
            key: "resetConfig",
            value: "",
            type: "button",
            title: this.i18n.settings.reset?.title || "Reset Settings",
            description: this.i18n.settings.reset?.description || "Reset all settings to default values",
            button: {
                label: this.i18n.settings.reset?.label || "Reset",
                callback:  async () => {
                    // if (confirm(this.i18n.settings.reset.confirm)) {
                        const defaultSettings = this.getDefaultSettings();
                        // Update each setting item's value and UI element  只是UI改了，json的值没有改
                        for (const [key, value] of Object.entries(defaultSettings)) {
                            await this.settingUtils.set(key, value);
                        }
                        // await this.settingUtils.load();
                    // }
                    // 光标重新点击

                }
            }
        });

        await this.settingUtils.load(); //导入配置并合并


        this.eventBus.on("open-menu-blockref", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
        this.eventBus.on("open-menu-link", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
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
                click: () => {
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

                    
                }
            });
        }
    }

    private async addMemoBlock(protyle: IProtyle) {
        await this.settingUtils.load(); //导入配置
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

        const selection = getSelectedHtml(protyle.toolbar.range);
        
        // 获取选中文本的样式，避免重复添加样式而导致样式被清除
        const selectedInfo = this.getSelectedParentHtml();
        let formatData;
        if (selectedInfo) {
            formatData = {
                datatype: selectedInfo.datatype,
                style: selectedInfo.style
            };
        }


        // 获取当前文档标题
        let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${protyle.block.id}' LIMIT 1`);
        let currentDocTitle = currentDoc[0].content;

        // 获取脚注容器标题
        let footnoteContainerTitle;
        switch (this.settingUtils.get("saveLocation")) {
            case '1':
                footnoteContainerTitle = this.settingUtils.get("footnoteContainerTitle").replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                if (!footnoteContainerTitle.startsWith("#")) {
                    footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                }
                break;
            case '2':
                footnoteContainerTitle = this.settingUtils.get("footnoteContainerTitle2").replace(/\$\{filename\}/g, currentDocTitle);
                // 需要检测输入的title有没有#，没有会自动变为二级title
                if (!footnoteContainerTitle.startsWith("#")) {
                    footnoteContainerTitle = `## ${footnoteContainerTitle}`;
                }
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
                docID = protyle.block.id;
                query_res = await sql(
                    `SELECT * FROM blocks AS b 
         WHERE root_id = '${docID}' 
         AND b.type='h' 
         AND b.ial like '%custom-plugin-footnote-parent="${protyle.block.id}"%' 
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
                    "custom-plugin-footnote-parent": protyle.block.id
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
         AND b.type='h' 
         AND b.ial like '%custom-plugin-footnote-parent="${protyle.block.id}"%' 
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
                    "custom-plugin-footnote-parent": protyle.block.id
                });
                break;

            case '3': // 子文档
                const existingDoc = await sql(
                    `SELECT * FROM blocks WHERE type='d' AND ial like '%custom-plugin-footnote-parent="${protyle.block.id}"%' LIMIT 1`
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
                        "custom-plugin-footnote-parent": protyle.block.id
                    });
                }
                footnoteContainerID = docID;
                break;

            case '4': // 父块后
                docID = protyle.block.id;
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
        let selectedTextPattern = /\s*custom-footnote-selected-text\s*/g;
        // 正则表达式匹配不含data-type的普通span标签，提取其中的文本
        let plainSpanPattern = /<span(?![^>]*data-type)[^>]*>(.*?)<\/span>/g;

        // 使用 replace() 方法替换匹配的部分为空字符串
        let cleanSelection = selection
            .replace(katexPattern, '')
            .replace(customFootnotePattern, '')
            .replace(selectedTextPattern, '')
            .replace(plainSpanPattern, '$1'); // 保留span标签中的文本内容
        let templates = this.settingUtils.get("templates");
        templates = templates.replace(/\$\{selection\}/g, cleanSelection);
        templates = templates.replace(/\$\{content\}/g, zeroWhite);
        templates = templates.replace(/\$\{refID\}/g, currentBlockId);
        templates = await renderTemplates(templates);

        async function renderTemplates(templates: string): Promise<string> {
            // First pattern to match ${{...}}
            const dollarPattern = /\$(\{\{[^}]*\}\})/g;
            let renderedTemplate = templates;
            let match;

            // Process each ${{...}} block one at a time
            while ((match = dollarPattern.exec(templates)) !== null) {
                const sprigExpression = match[1]; // 获取{{...}}部分
                console.log("Sprig expression:", sprigExpression);
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
                        let children = await getChildBlocks(footnoteContainerID);
                        // 默认顺序插入
                        if (children.length > 0) {
                            // 在最后一个子块后面添加(使用 insertBlock 并指定 previousID)
                            back = await insertBlock(
                                "markdown",
                                templates,
                                undefined, // nextID 
                                children[children.length - 1].id, // previousID - 放在最后一个子块后面
                                undefined // parentID
                            );
                        } else {
                            // 如果没有子块,直接在标题下添加
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
        await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": 'true' });
        await setBlockAttrs(newBlockId, { "alias": this.settingUtils.get("footnoteAlias") });

        // 选中的文本添加样式
        // 选中的文本添加样式
        let range = protyle.toolbar.range;
        if (this.settingUtils.get("selectFontStyle") === '2') {
            // 在想要不要不用时间戳，用id来标识，这样貌似更方便删除
            protyle.toolbar.setInlineMark(protyle, `custom-footnote-selected-text-${newBlockId}`, "range");
        }

        // --------------------------添加脚注引用 -------------------------- // 

        protyle.toolbar.range = range;
        const { x, y } = protyle.toolbar.range.getClientRects()[0]
        // 将range的起始点和结束点都移动到选中文本的末尾
        range.collapse(false); // false 表示将光标移动到选中文本的末尾
        
        // 需要先清除样式，避免带上选中文本的样式
        try {
            protyle.toolbar.setInlineMark(protyle, "clear", "range");
        }catch (e) {
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

        // 给脚注块引添加属性，方便后续查找，添加其他功能
        if (memoELement) {
            memoELement.setAttribute("custom-footnote", newBlockId);
            // 保存脚注块引添加的自定义属性值
            saveViaTransaction(memoELement)
        }



        // 关闭工具栏
        protyle.toolbar.element.classList.add("fn__none")

        // 显示浮窗，来填写内容
        this.addFloatLayer({
            ids: [newBlockId],
            defIds: [],
            x: x,
            y: y - 70
        });
    }

    private getSelectedParentHtml() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let selectedNode = range.startContainer;
            const endNode = range.endContainer;

            // 检查 endNode 的 previousSibling
            if (endNode.previousSibling && endNode.previousSibling.nodeType === Node.ELEMENT_NODE) {
                const previousSibling = endNode.previousSibling;
                if (previousSibling.tagName.toLowerCase() === "span" && previousSibling.classList.contains("render-node")) {
                    selectedNode = previousSibling;
                }
            }

            let parentElement = selectedNode.nodeType === Node.TEXT_NODE ? selectedNode.parentNode : selectedNode;
            while (parentElement && !parentElement.hasAttribute("data-type")) {
                parentElement = parentElement.parentElement;
            }

            if (parentElement && parentElement.tagName.toLowerCase() === "span") {
                const result = {
                    html: parentElement.outerHTML,
                    datatype: parentElement.getAttribute("data-type"),
                    style: parentElement.getAttribute("style")
                };
                // 清空选区
                selection.removeAllRanges();
                return result;
            }
        }
        // 清空选区
        selection.removeAllRanges();
        return null;
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
