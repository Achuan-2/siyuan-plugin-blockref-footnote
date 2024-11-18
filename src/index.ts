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

const STORAGE_NAME = "menu-config";
const zeroWhite = "​"



let addFloatLayer
export default class PluginMemo extends Plugin {

    private isMobile: boolean;
    private settingUtils: SettingUtils;
    // 添加工具栏按钮
    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push(
            {
                name: "footnote",
                icon: "iconInfo",
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
        console.log(this.i18n.tips);
        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
        });

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

        let data = await this.settingUtils.load(); //导入配置并合并
        console.log(data);

        addFloatLayer = this.addFloatLayer

        const frontEnd = getFrontend();

        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.eventBus.on("open-menu-blockref", this.deleteMemo)
    }

    onLayoutReady() {
    }

    onunload() {
    }


    private deleteMemo({ detail }: any) {
        // console.log(detail)
        if (detail.element && detail.element.getAttribute("data-memo")) {
            detail.menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.deleteMemo,
                click: () => {
                    deleteBlock(detail.element.getAttribute("data-id"));
                    detail.element.outerHTML = detail.element.innerText
                }
            });
        }
    }
    private async addMemoBlock(protyle: IProtyle) {

        let data = await this.settingUtils.load(); //导入配置并合并
        let docID;
        if (data.save_location == 1) {
            docID = protyle.block.id;
        }
        else {
            docID = data.docID;
            // 如果docID为空，提示用户
            if (!docID) {
                pushErrMsg(this.i18n.errors.noDocId);
                return;
            }
        }

        // 先复制选中内容
        document.execCommand('copy')
        // 选中的文本是否添加样式
        switch (data.select_font_style) {
            case '2':
                protyle.toolbar.setInlineMark(protyle, "u", "range");
                break;
            case '3':
                protyle.toolbar.setInlineMark(protyle, "mark", "range");
                break;
            case '4':
                protyle.toolbar.setInlineMark(protyle, "strong", "range");
                break;
            case '5':
                protyle.toolbar.setInlineMark(protyle, "em", "range");
                break;
            default:
                console.log("无");
                break;
        }

        // 查询docID下有没有脚注标题，脚注标题属性为custom-plugin-footnote-parent=true
        let query_res = await sql(`SELECT * FROM blocks AS b WHERE root_id = '${docID}' AND b.type='h' AND b.ial like "%custom-plugin-memo-parent%"  limit 1`);
        console.log(query_res);
        let headingID;
        if (query_res.length == 0) {
            // 添加h2标题
            headingID = (await appendBlock("markdown", `
## ${this.i18n.footnoteTitle}`, docID))[0].doOperations[0].id; 
            // 添加脚注标题属性
            await setBlockAttrs(headingID, { "custom-plugin-memo-parent": "true" });
        } else {
            headingID = query_res[0].id
        }

        // 获取脚注模板
        const selection = await navigator.clipboard.readText(); // 获取选中文本
        data.templates = data.templates.replace("${selection}", selection);
        data.templates = data.templates.replace("${content}", zeroWhite);

        // 插入脚注
        let children = await getChildBlocks(headingID);
        let back;
        switch (data.order) {
            case '1':
                if (children.length > 0) {
                    // 在最后一个子块后面添加(使用 insertBlock 并指定 previousID)
                    back = await insertBlock(
                        "markdown",
                        data.templates,
                        undefined, // nextID 
                        children[children.length - 1].id, // previousID - 放在最后一个子块后面
                        undefined // parentID
                    );
                } else {
                    // 如果没有子块,直接在标题下添加
                    back = await appendBlock("markdown", data.templates, headingID);
                }
                break;
            case '2':
                back = await appendBlock("markdown", data.templates, headingID);
                break;
            default:
                back = await appendBlock("markdown", data.templates, headingID);
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
            color: `${newBlockId + zeroWhite + "" + zeroWhite + this.i18n.footnoteBlockref}`
        });
        let memoELement = protyle.element.querySelector(`span[data-id="${newBlockId}"]`)
        if (memoELement) {
            memoELement.setAttribute('data-memo', '1');
        }
        saveViaTransaction(memoELement)
        // 关闭工具栏
        protyle.toolbar.element.classList.add("fn__none")
        addFloatLayer({
            ids: [newBlockId],
            defIds: [],
            x: x,
            y: y - 70
        });
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
