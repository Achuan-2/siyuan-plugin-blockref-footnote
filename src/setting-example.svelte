<script lang="ts">
    import { onMount } from 'svelte';
    import SettingPanel from '@/libs/components/setting-panel.svelte';
    import { getDefaultSettings } from './defaultSettings';
    import { t } from './utils/i18n';
    import { confirm } from 'siyuan';
    import { pushMsg } from './api';
    export let plugin;

    let settings = { ...getDefaultSettings() };

    interface ISettingGroup {
        name: string;
        items: ISettingItem[];
    }

    let groups: ISettingGroup[] = [
        {
            name: t('settings.groups.container') || 'Container Settings',
            items: [
                {
                    key: 'saveLocation',
                    value: settings.saveLocation,
                    type: 'select',
                    title: t('settings.saveLocation.title') || 'Save Location',
                    description:
                        t('settings.saveLocation.description') || 'Choose where to save footnotes',
                    options: {
                        '1': t('settings.saveLocation.current') || 'Current Document',
                        '2': t('settings.saveLocation.specified') || 'Specified Document',
                        '3': t('settings.saveLocation.childDoc') || 'Child Document',
                        '4': t('settings.saveLocation.afterParent') || 'After Parent Block',
                    },
                },
                {
                    key: 'footnoteContainerTitle',
                    value: settings.footnoteContainerTitle,
                    type: 'textinput',
                    title: t('settings.footnoteContainerTitle.title') || 'Footnote Container Title',
                    description:
                        t('settings.footnoteContainerTitle.description') ||
                        'Title for footnote container',
                },
                {
                    key: 'docID',
                    value: settings.docID,
                    type: 'textinput',
                    title: t('settings.docId.title') || 'Document ID',
                    description:
                        t('settings.docId.description') || 'Specify document ID for footnotes',
                },
                {
                    key: 'footnoteContainerTitle2',
                    value: settings.footnoteContainerTitle2,
                    type: 'textinput',
                    title: t('settings.footnoteContainerTitle2.title') || 'Container Title 2',
                    description:
                        t('settings.footnoteContainerTitle2.description') ||
                        'Alternative container title',
                },
                {
                    key: 'footnoteContainerTitle3',
                    value: settings.footnoteContainerTitle3,
                    type: 'textinput',
                    title: t('settings.footnoteContainerTitle3.title') || 'Container Title 3',
                    description:
                        t('settings.footnoteContainerTitle3.description') ||
                        'Third container title option',
                },
                {
                    key: 'updateFootnoteContainerTitle',
                    value: settings.updateFootnoteContainerTitle,
                    type: 'checkbox',
                    title:
                        t('settings.updateFootnoteContainerTitle.title') ||
                        'Update Container Title',
                    description:
                        t('settings.updateFootnoteContainerTitle.description') ||
                        'Automatically update container title',
                },
                {
                    key: 'order',
                    value: settings.order,
                    type: 'select',
                    title: t('settings.order.title') || 'Order',
                    description: t('settings.order.description') || 'Footnote ordering',
                    options: {
                        '1': t('settings.order.asc') || 'Ascending',
                        '2': t('settings.order.desc') || 'Descending',
                    },
                },
            ],
        },
        {
            name: t('settings.groups.style') || 'Style Settings',
            items: [
                {
                    key: 'footnoteRefStyle',
                    value: settings.footnoteRefStyle,
                    type: 'select',
                    title: t('settings.footnoteRefStyle.title') || 'Reference Style',
                    description:
                        t('settings.footnoteRefStyle.description') ||
                        'Style for footnote references',
                    options: {
                        '1': t('settings.footnoteRefStyle.ref') || 'Block Reference',
                        '2': t('settings.footnoteRefStyle.link') || 'Link',
                    },
                },
                {
                    key: 'footnoteBlockref',
                    value: settings.footnoteBlockref,
                    type: 'textinput',
                    title: t('settings.footnoteBlockref.title') || 'Footnote Reference Text',
                    description:
                        t('settings.footnoteBlockref.description') ||
                        'Text for footnote references',
                },
                {
                    key: 'selectFontStyle',
                    value: settings.selectFontStyle,
                    type: 'select',
                    title: t('settings.selectFontStyle.title') || 'Selection Style',
                    description:
                        t('settings.selectFontStyle.description') || 'Style for selected text',
                    options: {
                        '1': t('settings.selectFontStyle.none') || 'None',
                        '2': t('settings.selectFontStyle.custom') || 'Custom',
                    },
                },
                {
                    key: 'enableOrderedFootnotes',
                    value: settings.enableOrderedFootnotes,
                    type: 'checkbox',
                    title: t('settings.enableOrderedFootnotes.title') || 'Enable Ordered Footnotes',
                    description:
                        t('settings.enableOrderedFootnotes.description') ||
                        'Automatically number footnotes',
                },
                {
                    key: 'footnoteAlias',
                    value: settings.footnoteAlias,
                    type: 'textinput',
                    title: t('settings.footnoteAlias.title') || 'Footnote Alias',
                    description:
                        t('settings.footnoteAlias.description') || 'Alias for footnote blocks',
                },
                {
                    key: 'floatDialogEnable',
                    value: settings.floatDialogEnable,
                    type: 'checkbox',
                    title: t('settings.floatDialog.title') || 'Enable Float Dialog',
                    description:
                        t('settings.floatDialog.description') ||
                        'Show floating dialog for footnote editing',
                },
                {
                    key: 'enableFootnoteDock',
                    value: settings.enableFootnoteDock,
                    type: 'checkbox',
                    title: t('settings.footnoteDock.title') || 'Enable Footnote Dock',
                    description:
                        t('settings.footnoteDock.description') ||
                        'Show footnote dock panel for viewing and editing footnotes',
                },
                {
                    key: 'templates',
                    value: settings.templates,
                    type: 'textarea',
                    title: t('settings.template.title') || 'Template',
                    description:
                        t('settings.template.description') || 'Template for footnote content',
                    direction: 'row',
                    rows: 6,
                },
                {
                    key: 'css',
                    value: settings.css,
                    type: 'textarea',
                    title: t('settings.css.title') || 'Custom CSS',
                    description: t('settings.css.description') || 'Custom CSS styles for footnotes',
                    direction: 'row',
                    rows: 20,
                },
            ],
        },
        {
            name: t('settings.groups.reset') || 'Reset Settings',
            items: [
                {
                    key: 'reset',
                    value: '',
                    type: 'button',
                    title: t('settings.reset.title') || 'Reset Settings',
                    description:
                        t('settings.reset.description') || 'Reset all settings to default values',
                    button: {
                        label: t('settings.reset.label') || 'Reset',
                        callback: async () => {
                            confirm(
                                t('settings.reset.title') || 'Reset Settings',
                                t('settings.reset.confirmMessage') ||
                                    'Are you sure you want to reset all settings to default values? This action cannot be undone.',
                                async () => {
                                    // 确认回调
                                    settings = { ...getDefaultSettings() };
                                    updateGroupItems();
                                    await saveSettings();
                                    await pushMsg(t('settings.reset.message'));
                                },
                                () => {
                                    // 取消回调（可选）
                                    console.log('Reset cancelled');
                                }
                            );
                        },
                    },
                },
            ],
        },
    ];

    let focusGroup = groups[0].name;

    interface ChangeEvent {
        group: string;
        key: string;
        value: any;
    }

    const onChanged = ({ detail }: CustomEvent<ChangeEvent>) => {
        console.log(detail.key, detail.value);
        if (settings.hasOwnProperty(detail.key)) {
            settings[detail.key] = detail.value;
            saveSettings();

            // Handle special cases
            if (detail.key === 'css' && plugin.updateCSS) {
                plugin.updateCSS(detail.value);
            }

            // 即时处理脚注Dock栏的显示和隐藏
            if (detail.key === 'enableFootnoteDock' && plugin.handleFootnoteDockToggle) {
                plugin.handleFootnoteDockToggle(detail.value);
            }
        }
    };

    async function saveSettings() {
        await plugin.saveSettings(settings);
    }

    onMount(async () => {
        await runload();
    });

    async function runload() {
        const loadedSettings = await plugin.loadSettings();
        settings = { ...loadedSettings };
        updateGroupItems();
        console.debug('加载配置文件完成');
    }

    function updateGroupItems() {
        groups = groups.map(group => ({
            ...group,
            items: group.items.map(item => ({
                ...item,
                value: settings[item.key] ?? item.value,
            })),
        }));
    }

    $: currentGroup = groups.find(group => group.name === focusGroup);
</script>

<div class="fn__flex-1 fn__flex config__panel">
    <ul class="b3-tab-bar b3-list b3-list--background">
        {#each groups as group}
            <li
                data-name="editor"
                class:b3-list-item--focus={group.name === focusGroup}
                class="b3-list-item"
                on:click={() => {
                    focusGroup = group.name;
                }}
                on:keydown={() => {}}
            >
                <span class="b3-list-item__text">{group.name}</span>
            </li>
        {/each}
    </ul>
    <div class="config__tab-wrap">
        <SettingPanel
            group={currentGroup?.name || ''}
            settingItems={currentGroup?.items || []}
            display={true}
            on:changed={onChanged}
        />
    </div>
</div>

<style lang="scss">
    .config__panel {
        height: 100%;
        display: flex;
        flex-direction: row;
        overflow: hidden;
    }
    .config__panel > .b3-tab-bar {
        width: 170px;
    }

    .config__tab-wrap {
        flex: 1;
        height: 100%;
        overflow: auto;
        padding: 2px;
    }
</style>
