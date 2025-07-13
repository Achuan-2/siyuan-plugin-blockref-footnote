import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    IModel,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData
} from "siyuan";

import { appendBlock, deleteBlock, setBlockAttrs, getBlockAttrs, pushMsg, pushErrMsg, sql, renderSprig, getChildBlocks, insertBlock, renameDocByID, prependBlock, updateBlock, createDocWithMd, getDoc, getBlockKramdown, getBlockDOM } from "./api";
import "@/index.scss";

import SettingPanelComponent from "@/setting-example.svelte";

import { SettingUtils } from "./libs/setting-utils";
import { svelteDialog } from "./libs/dialog";
import { setPluginInstance, t } from "./utils/i18n";

const STORAGE_NAME = "config";
export const SETTINGS_FILE = "reminder-settings.json";
const TAB_TYPE = "reminder_calendar_tab";

// 默认设置
export const DEFAULT_SETTINGS = {
    textinput: 'test',
    slider: 0.5,
    checkbox: false,
};
export default class PluginSample extends Plugin {

    private settingUtils: SettingUtils;

    async onload() {
        // 设置i18n插件实例
        setPluginInstance(this);


        //const stateData = await this.loadData(STORAGE_NAME);

    }

    async onLayoutReady() {

    }

    async onunload() {
        console.log("onunload");
    }

    uninstall() {
        console.log("uninstall");
    }


    /**
     * 打开设置对话框
     */
    async openSettings() {
        let dialog = new Dialog({
            title: t("settingsPanel"),
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            height: "700px",
            destroyCallback: (options) => {
                pannel.$destroy();
            }
        });

        let pannel = new SettingPanelComponent({
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
        return { ...DEFAULT_SETTINGS, ...settings };
    }

    /**
     * 保存设置
     */
    async saveSettings(settings: any) {
        await this.saveData(SETTINGS_FILE, settings);
    }


}
