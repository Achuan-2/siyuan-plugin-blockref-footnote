import {
    Plugin,
    // getFrontend,
    Protyle
} from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, pushErrMsg, sql, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, createDocWithMd } from "./api";
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

    async onload() {



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

        this.settingUtils.addItem({
            key: "saveLocation",
            value: 1,
            type: "select",
            title: this.i18n.settings.saveLocation.title,
            description: this.i18n.settings.saveLocation.description,
            options: {
                1: this.i18n.settings.saveLocation.current,
                2: this.i18n.settings.saveLocation.specified,
                3: this.i18n.settings.saveLocation.childDoc
            },
            action: {
                callback: () => {
                    // Read data in real time
                    // this.settingUtils.takeAndSave("saveLocation")
                }
            }
        });
        this.settingUtils.addItem({
            key: "docID",
            value: "",
            type: "textinput",
            title: this.i18n.settings.docId.title,
            description: this.i18n.settings.docId.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "footnoteContainerTitle",
            value: this.i18n.settings.footnoteContainerTitle.value,
            type: "textinput",
            title: this.i18n.settings.footnoteContainerTitle.title,
            description: this.i18n.settings.footnoteContainerTitle.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "footnoteContainerTitle2",
            value: this.i18n.settings.footnoteContainerTitle2.value,
            type: "textinput",
            title: this.i18n.settings.footnoteContainerTitle2.title,
            description: this.i18n.settings.footnoteContainerTitle2.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "updateFootnoteContainerTitle",
            value: true,
            type: "checkbox",
            title: this.i18n.settings.updateFootnoteContainerTitle.title,
            description: this.i18n.settings.updateFootnoteContainerTitle.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "footnoteRefStyle",
            value: 1,
            type: "select",
            title: this.i18n.settings.footnoteRefStyle.title,
            description: this.i18n.settings.footnoteRefStyle.description,
            options: {
                1: this.i18n.settings.footnoteRefStyle.ref,
                2: this.i18n.settings.footnoteRefStyle.link,
            },
            action: {
                callback: () => {
                    // Read data in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "footnoteBlockref",
            value: this.i18n.settings.footnoteBlockref.value,
            type: "textinput",
            title: this.i18n.settings.footnoteBlockref.title,
            description: this.i18n.settings.footnoteBlockref.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "selectFontStyle",
            value: 1,
            type: "select",
            title: this.i18n.settings.selectFontStyle.title,
            description: this.i18n.settings.selectFontStyle.description,
            options: {
                1: this.i18n.settings.selectFontStyle.none,
                2: this.i18n.settings.selectFontStyle.underline,
                3: this.i18n.settings.selectFontStyle.highlight,
                4: this.i18n.settings.selectFontStyle.bold,
                5: this.i18n.settings.selectFontStyle.italic
            },
            action: {
                callback: () => {
                    // Read data in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "order",
            value: 1,
            type: "select",
            title: this.i18n.settings.order.title,
            description: this.i18n.settings.order.description,
            options: {
                1: this.i18n.settings.order.asc,
                2: this.i18n.settings.order.desc,
            },
            action: {
                callback: () => {
                    // Read data in real time
                }
            }
        });
        this.settingUtils.addItem({
            key: "templates",
            value: `{{{row
> \${selection}

\${content}
}}}
{: style="border: 2px dashed var(--b3-border-color);"}}`,
            type: "textarea",
            title: this.i18n.settings.template.title,
            description: this.i18n.settings.template.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                }
            }
        });

        await this.settingUtils.load(); //导入配置并合并


        this.eventBus.on("open-menu-blockref", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind
    }

    onLayoutReady() {
    }

    onunload() {
    }


    private deleteMemo = ({ detail }: any) => {
        if (detail.element && detail.element.getAttribute("custom-footnote") === "true") {
            detail.menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.deleteFootnote,
                click: () => {
                    // 删除脚注
                    deleteBlock(detail.element.getAttribute("data-id"));
                    // 删除块引
                    detail.element.remove();
                }
            });
        }
    }

    private async addMemoBlock(protyle: IProtyle) {

        await this.settingUtils.load(); //导入配置

        // 先复制选中内容
        document.execCommand('copy')
        // 获取选中文本的样式，避免重复添加样式而导致样式被清除
        const selectedInfo = this.getSelectedParentHtml();
        let formatData;
        if (selectedInfo) {
            formatData = {
                datatype: selectedInfo.datatype,
                style: selectedInfo.style
            };
        }

        // 选中的文本添加样式
        switch (this.settingUtils.get("selectFontStyle")) {
            case '2':
                // 使用正则表达式精确匹配 u 标签
                if (!formatData?.datatype?.match(/\bu\b/)) {
                    protyle.toolbar.setInlineMark(protyle, "u", "range");
                }
                break;
            case '3':
                if (!formatData?.datatype?.match(/\bmark\b/)) {
                    protyle.toolbar.setInlineMark(protyle, "mark", "range");
                }
                break;
            case '4':
                if (!formatData?.datatype?.match(/\bstrong\b/)) {
                    protyle.toolbar.setInlineMark(protyle, "strong", "range");
                }
                break;
            case '5':
                if (!formatData?.datatype?.match(/\bem\b/)) {
                    protyle.toolbar.setInlineMark(protyle, "em", "range");
                }
                break;
            default:
                // 默认选中文本不添加样式
                break;
        }
        // 获取当前文档标题
        let currentDoc = await sql(`SELECT * FROM blocks WHERE id = '${protyle.block.id}' LIMIT 1`);
        let currentDocTitle = currentDoc[0].content;

        // 获取脚注容器标题
        const footnoteContainerTitle = this.settingUtils.get("saveLocation") == 1
            ? this.settingUtils.get("footnoteContainerTitle").replace(/\$\{filename\}/g, currentDocTitle)
            : this.settingUtils.get("footnoteContainerTitle2").replace(/\$\{filename\}/g, currentDocTitle);
        // 处理文档 ID 和脚注容器 ID
        let docID;
        let footnoteContainerID: string;
        let query_res;
        switch (this.settingUtils.get("saveLocation")) {
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
                    footnoteContainerID = (await appendBlock("markdown", `## ${footnoteContainerTitle}`, docID))[0].doOperations[0].id;
                } else {
                    footnoteContainerID = query_res[0].id;
                    if (this.settingUtils.get("updateFootnoteContainerTitle")) {
                        await updateBlock("markdown", `## ${footnoteContainerTitle}`, footnoteContainerID);
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
                    footnoteContainerID = (await appendBlock("markdown", `## ${footnoteContainerTitle}`, docID))[0].doOperations[0].id;
                } else {
                    footnoteContainerID = query_res[0].id;
                    if (this.settingUtils.get("updateFootnoteContainerTitle")) {
                        await updateBlock("markdown", `## ${footnoteContainerTitle}`, footnoteContainerID);
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

            default:
                docID = protyle.block.id;
                await handleFootnoteTitleContainer();
        }




        // 获取脚注模板并替换为具体变量值
        const selection = await navigator.clipboard.readText(); // 获取选中文本
        // 过滤掉脚注文本 <sup>((id "text"))</sup>
        const cleanSelection = selection.replace(/<sup>\(\([^)]+\)\)<\/sup>/g, '');
        // console.log(cleanSelection);
        let templates = this.settingUtils.get("templates");
        templates = templates.replace(/\$\{selection\}/g, cleanSelection);
        templates = templates.replace(/\$\{content\}/g, zeroWhite);

        // 插入脚注
        let back;
        switch (this.settingUtils.get("order")) {
            case '2':
                // 倒序
                if (this.settingUtils.get("saveLocation") != 3) {
                    back = await appendBlock("markdown", templates, footnoteContainerID);
                } else {
                    back = await prependBlock("markdown", templates, footnoteContainerID);
                }
                break;
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

        let newBlockId = back[0].doOperations[0].id
        // 添加脚注属性
        await setBlockAttrs(newBlockId, { "custom-plugin-footnote-content": 'true' });
        // 添加脚注引用
        const { x, y } = protyle.toolbar.range.getClientRects()[0]
        let range = protyle.toolbar.range;

        // 将range的起始点和结束点都移动到选中文本的末尾
        range.collapse(false);


        // 添加块引，同时添加上标样式
        protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
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
            memoELement.setAttribute("custom-footnote", "true");
            // 保存脚注块引添加的自定义属性值
            saveViaTransaction(memoELement)
        }



        // 关闭工具栏
        protyle.toolbar.element.classList.add("fn__none")

        // 显示块引浮窗，来填写内容
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
