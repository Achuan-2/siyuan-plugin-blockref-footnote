import { t } from "./utils/i18n";

export const getDefaultSettings = () => ({
    // Container Settings
    saveLocation: '1',
    footnoteContainerTitle: t('settings.footnoteContainerTitle.value'),
    docID: "",
    footnoteContainerTitle2: t('settings.footnoteContainerTitle2.value'),
    footnoteContainerTitle3: t('settings.footnoteContainerTitle3.value'),
    updateFootnoteContainerTitle: true,
    order: '1',

    // Style Settings
    footnoteRefStyle: '1',
    footnoteBlockref: t('settings.footnoteBlockref.value'),
    selectFontStyle: '1',
    enableOrderedFootnotes: false,
    footnoteAlias: t('settings.footnoteAlias.value'),
    floatDialogEnable: true,

    // Template Settings
    templates: `>> \${selection} [[↩️]](siyuan://blocks/\${refID})
>> 
> \${content}
`,

    // Advanced Settings
    css: `/* 自定义脚注引用样式 */
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
}`,
});


