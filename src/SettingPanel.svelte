<script lang="ts">
    import { onMount } from 'svelte';
    import SettingPanel from '@/libs/components/setting-panel.svelte';
    import { getDefaultSettings } from './defaultSettings';
    import { t } from './utils/i18n';
    import { confirm } from 'siyuan';
    import { pushMsg, lsNotebooks,reloadUI } from './api';
    import { inputDialogSync } from './libs/dialog';
    export let plugin;

    let settings = { ...getDefaultSettings() };
    let notebookOptions: { [key: string]: string } = {};

    interface ISettingGroup {
        name: string;
        items: ISettingItem[];
    }

    // 定义所有可能的容器设置项
    const containerSettingItems: { [key: string]: ISettingItem } = {
        footnoteContainerTitle: {
            key: 'footnoteContainerTitle',
            value: settings.footnoteContainerTitle,
            type: 'textinput',
            title: t('settings.footnoteContainerTitle.title') || 'Footnote Container Title',
            description:
                t('settings.footnoteContainerTitle.description') ||
                'Title for footnote container',
        },
        docID: {
            key: 'docID',
            value: settings.docID,
            type: 'textinput',
            title: t('settings.docId.title') || 'Document ID',
            description:
                t('settings.docId.description') || 'Specify document ID for footnotes',
        },
        footnoteContainerTitle2: {
            key: 'footnoteContainerTitle2',
            value: settings.footnoteContainerTitle2,
            type: 'textinput',
            title: t('settings.footnoteContainerTitle2.title') || 'Container Title 2',
            description:
                t('settings.footnoteContainerTitle2.description') ||
                'Alternative container title',
        },
        footnoteContainerTitle3: {
            key: 'footnoteContainerTitle3',
            value: settings.footnoteContainerTitle3,
            type: 'textinput',
            title: t('settings.footnoteContainerTitle3.title') || 'Container Title 3',
            description:
                t('settings.footnoteContainerTitle3.description') ||
                'Third container title option',
        },
        footnoteNotebook: {
            key: 'footnoteNotebook',
            value: settings.footnoteNotebook,
            type: 'select',
            title: t('settings.footnoteNotebook.title') || 'Target Notebook',
            description: t('settings.footnoteNotebook.description') || 'Select notebook for footnotes',
            options: notebookOptions,
        },
        footnoteDocPath: {
            key: 'footnoteDocPath',
            value: settings.footnoteDocPath,
            type: 'textinput',
            title: t('settings.footnoteDocPath.title') || 'Document Path',
            description: t('settings.footnoteDocPath.description') || 'Path for footnote documents',
        },
    };

    // 根据 saveLocation 获取对应的存放设置项
    function getLocationSpecificItems(saveLocation: string): ISettingItem[] {
        switch (saveLocation) {
            case '1': // 当前文档
                return [{
                    ...containerSettingItems.footnoteContainerTitle,
                    value: settings.footnoteContainerTitle,
                }];
            case '2': // 指定文档
                return [
                    {
                        ...containerSettingItems.docID,
                        value: settings.docID,
                    },
                    {
                        ...containerSettingItems.footnoteContainerTitle2,
                        value: settings.footnoteContainerTitle2,
                    }
                ];
            case '3': // 子文档
                return [{
                    ...containerSettingItems.footnoteContainerTitle3,
                    value: settings.footnoteContainerTitle3,
                }];
            case '4': // 父块之后
                return [];
            case '5': // 指定路径存放
                return [
                    {
                        ...containerSettingItems.footnoteNotebook,
                        value: settings.footnoteNotebook,
                        options: notebookOptions,
                    },
                    {
                        ...containerSettingItems.footnoteDocPath,
                        value: settings.footnoteDocPath,
                    }
                ];
            default:
                return [];
        }
    }

    function getCustomPresetOptions(): Record<string, string> {
        const options: Record<string, string> = {
            '': settings.customPresets.length > 0
                ? (t('settings.presets.choose') || 'Choose a preset')
                : (t('settings.presets.empty') || 'No saved presets'),
        };
        settings.customPresets.forEach(preset => {
            options[preset.id] = preset.name;
        });
        return options;
    }

    function getPresetItems(): ISettingItem[] {
        return [
            {
                key: 'createCustomPreset',
                value: '',
                type: 'button',
                title: t('settings.presets.create.title') || 'Save Current Settings',
                description:
                    t('settings.presets.create.description') ||
                    'Save all current settings as a new preset',
                button: {
                    label: t('settings.presets.create.label') || 'Create Preset',
                    callback: createCustomPreset,
                },
            },
            {
                key: 'selectedCustomPresetId',
                value: settings.selectedCustomPresetId,
                type: 'select',
                title: t('settings.presets.saved.title') || 'Saved Presets',
                description: t('settings.presets.saved.description') || 'Select a saved preset',
                options: getCustomPresetOptions(),
            },
            {
                key: 'applyCustomPreset',
                value: '',
                type: 'button',
                title: t('settings.presets.apply.title') || 'Apply Preset',
                description: t('settings.presets.apply.description') || 'Switch to the selected preset',
                button: {
                    label: t('settings.presets.apply.label') || 'Apply',
                    callback: applySelectedCustomPreset,
                },
            },
            {
                key: 'updateCustomPreset',
                value: '',
                type: 'button',
                title: t('settings.presets.update.title') || 'Update Preset',
                description:
                    t('settings.presets.update.description') ||
                    'Overwrite the selected preset with all current settings',
                button: {
                    label: t('settings.presets.update.label') || 'Update',
                    callback: updateSelectedCustomPreset,
                },
            },
            {
                key: 'deleteCustomPreset',
                value: '',
                type: 'button',
                title: t('settings.presets.delete.title') || 'Delete Preset',
                description: t('settings.presets.delete.description') || 'Delete the selected preset',
                button: {
                    label: t('settings.presets.delete.label') || 'Delete',
                    callback: deleteSelectedCustomPreset,
                },
            },
        ];
    }

    function getCurrentSettingsSnapshot(): Record<string, any> {
        const presetMetadataKeys = new Set([
            'customPresets',
            'customPresetName',
            'selectedCustomPresetId',
        ]);
        const snapshot: Record<string, any> = {};
        Object.keys(getDefaultSettings()).forEach(key => {
            if (!presetMetadataKeys.has(key)) {
                snapshot[key] = settings[key];
            }
        });
        return JSON.parse(JSON.stringify(snapshot));
    }

    async function createCustomPreset() {
        const inputName = await inputDialogSync({
            title: t('settings.presets.create.dialogTitle') || 'Create Preset',
            placeholder: t('settings.presets.create.placeholder') || 'Enter a preset name',
            width: '420px',
            singleLine: true,
        });
        if (inputName === null) return;

        const name = inputName.trim();
        if (!name) {
            await pushMsg(t('settings.presets.messages.nameRequired') || 'Enter a preset name');
            return;
        }
        if (settings.customPresets.some(preset => preset.name === name)) {
            await pushMsg(t('settings.presets.messages.nameExists') || 'A preset with this name already exists');
            return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        settings.customPresets = [
            ...settings.customPresets,
            { id, name, settings: getCurrentSettingsSnapshot() },
        ];
        settings.selectedCustomPresetId = id;
        updateGroups();
        await saveSettings();
        await pushMsg(t('settings.presets.messages.created') || 'Preset created');
    }

    async function applySelectedCustomPreset() {
        const preset = settings.customPresets.find(item => item.id === settings.selectedCustomPresetId);
        if (!preset) {
            await pushMsg(t('settings.presets.messages.selectRequired') || 'Select a preset first');
            return;
        }

        const previousDockState = settings.enableFootnoteDock;
        settings = { ...settings, ...JSON.parse(JSON.stringify(preset.settings)) };
        if (settings.referenceInsertMode === '2') {
            settings.enableOrderedFootnotes = false;
        }
        updateGroups();
        updateGroupItems();
        await saveSettings();
        plugin.updateCSS?.(settings.css);
        await pushMsg(t('settings.presets.messages.applied') || 'Preset applied');
        if (previousDockState !== settings.enableFootnoteDock) {
            reloadUI();
        }
    }

    async function updateSelectedCustomPreset() {
        const preset = settings.customPresets.find(item => item.id === settings.selectedCustomPresetId);
        if (!preset) {
            await pushMsg(t('settings.presets.messages.selectRequired') || 'Select a preset first');
            return;
        }

        const message = (t('settings.presets.update.confirm') || 'Overwrite preset “${name}” with the current settings?')
            .replace('${name}', preset.name);
        confirm(
            t('settings.presets.update.title') || 'Update Preset',
            message,
            async () => {
                settings.customPresets = settings.customPresets.map(item =>
                    item.id === preset.id
                        ? { ...item, settings: getCurrentSettingsSnapshot() }
                        : item
                );
                await saveSettings();
                await pushMsg(t('settings.presets.messages.updated') || 'Preset updated');
            }
        );
    }

    async function deleteSelectedCustomPreset() {
        const preset = settings.customPresets.find(item => item.id === settings.selectedCustomPresetId);
        if (!preset) {
            await pushMsg(t('settings.presets.messages.selectRequired') || 'Select a preset first');
            return;
        }

        const message = (t('settings.presets.delete.confirm') || 'Delete preset “${name}”?')
            .replace('${name}', preset.name);
        confirm(
            t('settings.presets.delete.title') || 'Delete Preset',
            message,
            async () => {
                settings.customPresets = settings.customPresets.filter(item => item.id !== preset.id);
                settings.selectedCustomPresetId = settings.customPresets[0]?.id || '';
                updateGroups();
                await saveSettings();
                await pushMsg(t('settings.presets.messages.deleted') || 'Preset deleted');
            }
        );
    }

    function getOrderedFootnotesSettingItem(): ISettingItem {
        return {
            key: 'enableOrderedFootnotes',
            value: settings.enableOrderedFootnotes,
            type: 'checkbox',
            title: t('settings.enableOrderedFootnotes.title') || 'Enable Ordered Footnotes',
            description:
                t('settings.enableOrderedFootnotes.description') ||
                'Automatically number footnotes',
        };
    }

    function getFootnoteBlockrefSettingItem(): ISettingItem {
        return {
            key: 'footnoteBlockref',
            value: settings.footnoteBlockref,
            type: 'textinput',
            title: t('settings.footnoteBlockref.title') || 'Footnote Reference Text',
            description:
                t('settings.footnoteBlockref.description') ||
                'Text for footnote references',
        };
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
                        '5': t('settings.saveLocation.customPath') || 'Custom Path',
                    },
                },
                // 动态添加对应存放位置的设置项
                ...getLocationSpecificItems(settings.saveLocation),
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
                    key: 'referenceInsertMode',
                    value: settings.referenceInsertMode,
                    type: 'select',
                    title: t('settings.referenceInsertMode.title') || 'Footnote Insert Mode',
                    description:
                        t('settings.referenceInsertMode.description') ||
                        'Choose whether to append an anchor or turn the selected text into a block reference',
                    options: {
                        '1': t('settings.referenceInsertMode.footnote') || 'Footnote Anchor',
                        '2': t('settings.referenceInsertMode.blockRef') || 'Use Selected Text as Reference',
                    },
                },
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
                ...(settings.referenceInsertMode !== '2' ? [getFootnoteBlockrefSettingItem()] : []),
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
                ...(settings.referenceInsertMode !== '2' ? [getOrderedFootnotesSettingItem()] : []),
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
            name: t('settings.groups.dock') || 'Footnote Dock',
            items: [
                {
                    key: 'enableFootnoteDock',
                    value: settings.enableFootnoteDock,
                    type: 'checkbox',
                    title: t('settings.footnoteDock.title') || 'Enable Footnote Dock',
                    description:
                        t('settings.footnoteDock.description') ||
                        'Show footnote dock panel for viewing and editing footnotes',
                },
            ],
        },
        {
            name: t('settings.groups.presets') || 'Presets',
            items: getPresetItems(),
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
                                    updateGroups();
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
            if (detail.key === 'referenceInsertMode' && detail.value === '2') {
                settings.enableOrderedFootnotes = false;
            }
            saveSettings();

            // Handle special cases
            if (detail.key === 'css' && plugin.updateCSS) {
                plugin.updateCSS(detail.value);
            }

            // 即时处理脚注Dock栏的显示和隐藏
            if (detail.key === 'enableFootnoteDock' && plugin.handleFootnoteDockToggle) {
                reloadUI();
            }

            // 当存放位置改变时，重新构建 groups 以显示对应的设置项
            if (detail.key === 'saveLocation' || detail.key === 'referenceInsertMode') {
                updateGroups();
            }
        }
    };

    async function saveSettings() {
        await plugin.saveSettings(settings);
    }

    onMount(async () => {
        await loadNotebooks();
        await runload();
    });

    // 加载笔记本列表
    async function loadNotebooks() {
        try {
            const notebooks = await lsNotebooks();
            if (notebooks && notebooks.notebooks) {
                const options: { [key: string]: string } = {};
                notebooks.notebooks.forEach((nb: any) => {
                    if (!nb.closed) {
                        options[nb.id] = nb.name;
                    }
                });
                notebookOptions = options;
            }
        } catch (error) {
            console.error('Failed to load notebooks:', error);
        }
    }

    async function runload() {
        const loadedSettings = await plugin.loadSettings();
        settings = { ...loadedSettings };
        let settingsNormalized = false;
        if (settings.referenceInsertMode === '2') {
            settingsNormalized = settings.enableOrderedFootnotes;
            settings.enableOrderedFootnotes = false;
        }
        updateGroups();
        updateGroupItems();
        if (settingsNormalized) {
            await saveSettings();
        }
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

    // 当 saveLocation 改变时，重新构建 Container Settings 组的 items
    function updateGroups() {
        groups = groups.map(group => {
            if (group.name === (t('settings.groups.container') || 'Container Settings')) {
                return {
                    ...group,
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
                                '5': t('settings.saveLocation.customPath') || 'Custom Path',
                            },
                        },
                        // 动态添加对应存放位置的设置项
                        ...getLocationSpecificItems(settings.saveLocation),
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
                };
            }
            if (group.name === (t('settings.groups.presets') || 'Presets')) {
                return {
                    ...group,
                    items: getPresetItems(),
                };
            }
            if (group.name === (t('settings.groups.style') || 'Style Settings')) {
                const items = group.items.filter(item =>
                    item.key !== 'enableOrderedFootnotes' && item.key !== 'footnoteBlockref'
                );
                if (settings.referenceInsertMode !== '2') {
                    const blockrefIndex = items.findIndex(item => item.key === 'footnoteRefStyle') + 1;
                    items.splice(blockrefIndex, 0, getFootnoteBlockrefSettingItem());
                    const orderedIndex = items.findIndex(item => item.key === 'selectFontStyle') + 1;
                    items.splice(orderedIndex, 0, getOrderedFootnotesSettingItem());
                }
                return {
                    ...group,
                    items,
                };
            }
            return group;
        });
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
        width: min(30%, 170px);
    }

    .config__tab-wrap {
        flex: 1;
        height: 100%;
        overflow: auto;
        padding: 2px;
    }
</style>
