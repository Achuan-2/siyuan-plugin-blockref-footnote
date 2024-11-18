import {
    Plugin,
    showMessage,
    Dialog,
    getFrontend,
    getBackend,
    Protyle
} from "siyuan";
import "@/index.scss";
import { IMenuItem } from "siyuan/types";

import { appendBlock, deleteBlock, setBlockAttrs, pushErrMsg, sql, getChildBlocks, insertBlock } from "./api";
import { SettingUtils } from "./libs/setting-utils";

const STORAGE_NAME = "config";
const zeroWhite = "​"



export default class PluginMemo extends Plugin {

    private isMobile: boolean;
    private settingUtils: SettingUtils;
    // 添加自定义svg
    
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
            key: "save_location",
            value: 1,
            type: "select",
            title: this.i18n.settings.saveLocation.title,
            description: this.i18n.settings.saveLocation.description,
            options: {
                1: this.i18n.settings.saveLocation.current,
                2: this.i18n.settings.saveLocation.specified
            },
            action: {
                callback: () => {
                    // Read data in real time
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
            key: "select_font_style",
            value: 1,
            type: "select",
            title: this.i18n.settings.fontStyle.title,
            description: this.i18n.settings.fontStyle.description,
            options: {
                1: this.i18n.settings.fontStyle.none,
                2: this.i18n.settings.fontStyle.underline,
                3: this.i18n.settings.fontStyle.highlight,
                4: this.i18n.settings.fontStyle.bold,
                5: this.i18n.settings.fontStyle.italic
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
            key: "footnoteTitle",
            value: this.i18n.settings.footnoteTitle.value,
            type: "textinput",
            title: this.i18n.settings.footnoteTitle.title,
            description: this.i18n.settings.footnoteTitle.description,
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
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
            key: "templates",
            value: `>> \${selection}
>> 
> 💡\${content}`,
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


        const frontEnd = getFrontend();

        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        
        this.eventBus.on("open-menu-blockref", this.deleteMemo.bind(this)); // 注意：事件回调函数中的 this 指向发生了改变。需要bind

        // 添加悬浮事件监听
        this.eventBus.on("mouseenter-block-ref", this.highlightMemo);
        this.eventBus.on("mouseleave-block-ref", this.unhighlightMemo);
    }

    onLayoutReady() {
    }

    onunload() {
    }


    private deleteMemo = ({ detail }: any) => {
        if (detail.element && detail.element.style.cssText.indexOf("memo") !=-1) {
            detail.menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.deleteFootnote,
                click: () => {
                    deleteBlock(detail.element.getAttribute("data-id"));
                    // 删除detail element
                    detail.element.remove();
                }
            });
        }
    }
    private async addMemoBlock(protyle: IProtyle) {

        await this.settingUtils.load(); //导入配置
        let docID;
        if (this.settingUtils.get("save_location") == 1) {
            docID = protyle.block.id;
        }
        else {
            docID = this.settingUtils.get("docID");
            // 如果docID为空，提示用户
            if (!docID) {
                pushErrMsg(this.i18n.errors.noDocId);
                return;
            }
        }

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
        switch (this.settingUtils.get("select_font_style")) {
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
        // 查询docID下有没有脚注标题，脚注标题属性为custom-plugin-footnote-parent=true
        let query_res = await sql(`SELECT * FROM blocks AS b WHERE root_id = '${docID}' AND b.type='h' AND b.ial like "%custom-plugin-memo-parent%"  limit 1`);
        let headingID;
        if (query_res.length == 0) {
            // 添加h2标题
            headingID = (await appendBlock("markdown", `
## ${this.settingUtils.get("footnoteTitle")}`, docID))[0].doOperations[0].id; 
            // 添加脚注标题属性
            await setBlockAttrs(headingID, { "custom-plugin-memo-parent": "true" });
        } else {
            headingID = query_res[0].id
        }

        // 获取脚注模板
        const selection = await navigator.clipboard.readText(); // 获取选中文本
        let templates = this.settingUtils.get("templates");
        templates = templates.replace("${selection}", selection);
        templates = templates.replace("${content}", zeroWhite);

        // 插入脚注
        let children = await getChildBlocks(headingID);
        let back;
        switch (this.settingUtils.get("order")) {
            case '2':
                // 倒序
                back = await appendBlock("markdown", templates, headingID);
                break;
            default:
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
                    back = await appendBlock("markdown", templates, headingID);
                }
                break;
        }

        let newBlockId = back[0].doOperations[0].id
        const { x, y } = protyle.toolbar.range.getClientRects()[0]
        let range = protyle.toolbar.range;

        //
        const str = ""
        const textNode = document.createTextNode(str);
        // 将范围的起始点和结束点都移动到选中文本的末尾
        range.collapse(false);
        protyle.toolbar.range.insertNode(textNode);
        protyle.toolbar.range.setEndAfter(textNode);
        protyle.toolbar.range.setStartBefore(textNode);

        // 添加块引，同时添加上标样式
        protyle.toolbar.setInlineMark(protyle, "clear", "toolbar");
        protyle.toolbar.setInlineMark(protyle, "block-ref sup", "range", {
            type: "id",
            color: `${newBlockId + zeroWhite + "s" + zeroWhite + this.settingUtils.get("footnoteBlockref")}`
        });
        let memoELement = protyle.element.querySelector(`span[data-id="${newBlockId}"]`)
        if (memoELement) {
            memoELement.setAttribute("style", "--memo: 1");
        }
        // 保存
        saveViaTransaction(memoELement)
        // 关闭工具栏
        protyle.toolbar.element.classList.add("fn__none")
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

    private highlightMemo = ({ detail }: any) => {
        const element = detail.target;
        // 检查是否是脚注引用
        if (element && element.style.cssText.indexOf("memo") !== -1) {
            // 给引用添加高亮样式
            element.style.backgroundColor = "var(--b3-theme-primary-light)";
        }
    }

    private unhighlightMemo = ({ detail }: any) => {
        const element = detail.target; 
        if (element && element.style.cssText.indexOf("memo") !== -1) {
            // 移除高亮样式
            element.style.backgroundColor = "";
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
