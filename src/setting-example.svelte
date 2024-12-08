<script lang="ts">
    import type PluginFootnote from './index';
    import SettingPanel from "./libs/components/setting-panel.svelte";
    
    export let i18n;
    export let plugin: PluginFootnote; // Add plugin as prop

    let groups: string[] = [
        i18n.settings.groups.container,
        i18n.settings.groups.style
    ];
    let focusGroup = groups[0];

    // Container Settings
    const containerItems: ISettingItem[] = [
        {
            type: 'select',
            title: i18n.settings.saveLocation.title,
            description: i18n.settings.saveLocation.description,
            key: 'saveLocation',
            value: '1',
            options: {
                1: i18n.settings.saveLocation.current,
                2: i18n.settings.saveLocation.specified,
                3: i18n.settings.saveLocation.childDoc,  
                4: i18n.settings.saveLocation.afterParent
            }
        },
        {
            type: 'textinput',
            title: i18n.settings.footnoteContainerTitle.title,
            description: i18n.settings.footnoteContainerTitle.description,
            key: 'footnoteContainerTitle',
            value: i18n.settings.footnoteContainerTitle.value
        },
        {
            type: 'textinput',
            title: i18n.settings.docId.title,
            description: i18n.settings.docId.description,
            key: 'docID',
            value: ''
        },
        {
            type: 'checkbox',
            title: i18n.settings.updateFootnoteContainerTitle.title,
            description: i18n.settings.updateFootnoteContainerTitle.description,
            key: 'updateFootnoteContainerTitle',
            value: true
        },
        {
            type: 'select',
            title: i18n.settings.order.title,
            description: i18n.settings.order.description,
            key: 'order',
            value: '1',
            options: {
                1: i18n.settings.order.asc,
                2: i18n.settings.order.desc
            }
        }
    ];

    // Style Settings
    const styleItems: ISettingItem[] = [
        {
            type: 'select',
            title: i18n.settings.footnoteRefStyle.title,
            description: i18n.settings.footnoteRefStyle.description,
            key: 'footnoteRefStyle',
            value: '1',
            options: {
                1: i18n.settings.footnoteRefStyle.ref,
                2: i18n.settings.footnoteRefStyle.link
            }
        },
        {
            type: 'textinput',
            title: i18n.settings.footnoteBlockref.title,
            description: i18n.settings.footnoteBlockref.description,
            key: 'footnoteBlockref',
            value: i18n.settings.footnoteBlockref.value
        },
        {
            type: 'checkbox',
            title: i18n.settings.enableOrderedFootnotes.title,
            description: i18n.settings.enableOrderedFootnotes.description,
            key: 'enableOrderedFootnotes',
            value: false
        },
        {
            type: 'select',
            title: i18n.settings.selectFontStyle.title,
            description: i18n.settings.selectFontStyle.description,
            key: 'selectFontStyle',
            value: '1',
            options: {
                1: i18n.settings.selectFontStyle.none,
                2: i18n.settings.selectFontStyle.custom
            }
        },
        {
            type: 'checkbox',
            title: i18n.settings.floatDialog.title,
            description: i18n.settings.floatDialog.description,
            key: 'floatDialogEnable',
            value: true
        },
        {
            type: 'textarea',
            title: i18n.settings.template.title,
            description: i18n.settings.template.description,
            key: 'templates',
            value: '',
            direction: 'row'
        },
        {
            type: 'textinput',
            title: i18n.settings.footnoteAlias.title,
            description: i18n.settings.footnoteAlias.description,
            key: 'footnoteAlias',
            value: ''
        },
        {
            type: 'textarea',
            title: i18n.settings.css.title,
            description: i18n.settings.css.description,
            key: 'css',
            value: '',
            direction: 'row'
        }
    ];

    // Initialize settings values from plugin
    $: {
        if (plugin) {
            containerItems.forEach(item => {
                item.value = plugin.settingUtils.get(item.key);
            });
            styleItems.forEach(item => {
                item.value = plugin.settingUtils.get(item.key);
            });
        }
    }

    const onChanged = async ({ detail }: CustomEvent<ChangeEvent>) => {
        if (detail.group === groups[0] || detail.group === groups[1]) {
            // Update plugin settings
            await plugin.settingUtils.set(detail.key, detail.value);
            await plugin.settingUtils.save();

            // Update CSS if needed 
            if (detail.key === 'css') {
                plugin.updateCSS(detail.value);
            }
        }
    };
</script>

<div class="fn__flex-1 fn__flex config__panel">
    <ul class="b3-tab-bar b3-list b3-list--background">
        {#each groups as group}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <li
                data-name="editor"
                class:b3-list-item--focus={group === focusGroup}
                class="b3-list-item"
                on:click={() => {
                    focusGroup = group;
                }}
                on:keydown={() => {}}
            >
                <span class="b3-list-item__text">{group}</span>
            </li>
        {/each}
    </ul>
    <div class="config__tab-wrap">
        <SettingPanel
            group={groups[0]}
            settingItems={containerItems}
            display={focusGroup === groups[0]}
            on:changed={onChanged}
            on:click={({ detail }) => { console.debug("Click:", detail.key); }}
        >
            <div class="fn__flex b3-label">
                💡 This is our default settings.
            </div>
        </SettingPanel>
        <SettingPanel
            group={groups[1]}
            settingItems={styleItems}
            display={focusGroup === groups[1]}
            on:changed={onChanged}
            on:click={({ detail }) => { console.debug("Click:", detail.key); }}
        >
        </SettingPanel>
    </div>
</div>

<style lang="scss">
    .config__panel {
        height: 100%;
    }
    .config__panel > ul > li {
        padding-left: 1rem;
    }
    .config__tab-wrap {
        overflow: auto;
        box-sizing: border-box;
        background-color: var(--b3-theme-background);
        border-radius: 0 var(--b3-border-radius-b) var(--b3-border-radius-b) 0;
        width: 100%;
        height: 600px;
        display: flex;
        flex-direction: column;
    }
</style>

