<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Protyle } from 'siyuan';
    import { sql, getBlockDOM } from '../api';
    import { t } from '../utils/i18n';

    export let plugin;

    let currentDocId = '';
    let footnotes = [];
    let protyleInstances = new Map();
    let containerElement;
    let refreshInterval;
    let isLoading = false;
    let hasError = false;

    interface Footnote {
        id: string;
        content: string;
        refBlockContent: string;
        created: string;
    }

    async function getCurrentDocId() {
        const activeElement = document
            .querySelector('.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title')
            ?.getAttribute('data-node-id');
        if (activeElement) {
            return activeElement;
        }

        const fallbackElement = document
            .querySelector('.protyle.fn__flex-1:not(.fn__none) .protyle-title')
            ?.getAttribute('data-node-id');
        return fallbackElement || '';
    }

    async function loadFootnotes() {
        const docId = await getCurrentDocId();
        if (!docId) return;

        // 移除阻止同一文档重新加载的条件，以便更新脚注数量
        // if (docId === currentDocId && footnotes.length > 0) return;

        currentDocId = docId;
        isLoading = true;
        hasError = false;

        // 清理现有的Protyle实例
        protyleInstances.forEach(protyle => {
            if (protyle && protyle.destroy) {
                try {
                    protyle.destroy();
                } catch (e) {
                    console.warn('Error destroying protyle:', e);
                }
            }
        });
        protyleInstances.clear();

        try {
            console.log('Loading footnotes for doc:', docId);

            // 查询当前文档的所有脚注
            const footnoteBlocks = await sql(`
                SELECT * FROM blocks 
                WHERE ial LIKE '%custom-plugin-footnote-content="${docId}"%' 
                ORDER BY created ASC
            `);

            console.log('Found footnote blocks:', footnoteBlocks);

            // 确保创建新数组以触发响应式更新
            let newFootnotes = [];

            // 为每个脚注块获取引用的块内容
            for (let block of footnoteBlocks) {
                try {
                    // 查找包含此脚注引用的块
                    const refBlocks = await sql(`
                        SELECT id, content FROM blocks 
                        WHERE (content LIKE '%${block.id}%' OR markdown LIKE '%${block.id}%')
                        AND root_id = '${docId}' 
                        AND id != '${block.id}'
                        AND type IN ('p', 'h')
                        LIMIT 1
                    `);

                    let refBlockContent = '';
                    if (refBlocks.length > 0) {
                        refBlockContent = refBlocks[0].content;
                    }

                    newFootnotes.push({
                        id: block.id,
                        content: block.content,
                        refBlockContent: refBlockContent || `脚注 ${block.id.substring(0, 8)}...`,
                        created: block.created,
                    });
                } catch (error) {
                    console.warn('Error processing footnote:', block.id, error);
                    newFootnotes.push({
                        id: block.id,
                        content: block.content,
                        refBlockContent: `脚注 ${block.id.substring(0, 8)}...`,
                        created: block.created,
                    });
                }
            }

            // 使用新数组替换旧数组，确保触发响应式更新
            footnotes = newFootnotes;
            console.log('Processed footnotes:', footnotes);
        } catch (error) {
            console.error('Failed to load footnotes:', error);
            footnotes = [];
            hasError = true;
        } finally {
            isLoading = false;
        }
    }

    function createProtyleForFootnote(footnoteId: string, container: HTMLElement) {
        // 先清理可能存在的实例
        if (protyleInstances.has(footnoteId)) {
            const existingProtyle = protyleInstances.get(footnoteId);
            if (existingProtyle && existingProtyle.destroy) {
                try {
                    existingProtyle.destroy();
                } catch (e) {
                    console.warn('Error destroying existing protyle:', e);
                }
            }
            protyleInstances.delete(footnoteId);
        }

        try {
            console.log('Creating Protyle for footnote:', footnoteId);

            // 清空容器
            container.innerHTML = '';

            const protyle = new Protyle(window.siyuan.ws.app, container, {
                blockId: footnoteId,
                mode: 'wysiwyg',
                action: ['cb-get-focus'],
                render: {
                    breadcrumb: false,
                    background: false,
                    title: false,
                    gutter: false,
                },
            });

            protyleInstances.set(footnoteId, protyle);
            console.log('Protyle created successfully for:', footnoteId);
            return protyle;
        } catch (error) {
            console.error(`Failed to create Protyle for footnote ${footnoteId}:`, error);
            return null;
        }
    }

    function handleProtyleMount(node: HTMLElement, footnoteId: string) {
        // 立即创建实例
        setTimeout(() => {
            if (node && footnoteId) {
                console.log('Action directive creating protyle for:', footnoteId);
                createProtyleForFootnote(footnoteId, node);
            }
        }, 10);

        return {
            update(newFootnoteId: string) {
                if (node && newFootnoteId && newFootnoteId !== footnoteId) {
                    console.log(
                        'Action directive updating protyle from',
                        footnoteId,
                        'to',
                        newFootnoteId
                    );
                    setTimeout(() => {
                        createProtyleForFootnote(newFootnoteId, node);
                    }, 10);
                }
            },
            destroy() {
                console.log('Action directive destroying protyle for:', footnoteId);
                if (protyleInstances.has(footnoteId)) {
                    const protyle = protyleInstances.get(footnoteId);
                    if (protyle && protyle.destroy) {
                        try {
                            protyle.destroy();
                        } catch (e) {
                            console.warn('Error destroying protyle on unmount:', e);
                        }
                    }
                    protyleInstances.delete(footnoteId);
                }
            },
        };
    }

    async function refreshFootnotes() {
        const newDocId = await getCurrentDocId();
        if (newDocId !== currentDocId) {
            await loadFootnotes();
            return;
        }
        
        // 检查同一文档内脚注数量是否有变化
        try {
            const footnoteBlocks = await sql(`
                SELECT COUNT(*) as count FROM blocks 
                WHERE ial LIKE '%custom-plugin-footnote-content="${currentDocId}"%'
            `);
            
            const currentCount = footnoteBlocks[0]?.count || 0;
            
            if (currentCount !== footnotes.length) {
                console.log('Footnote count changed, refreshing...', currentCount, footnotes.length);
                await loadFootnotes();
            }
        } catch (error) {
            console.error('Error checking footnote count:', error);
        }
    }

    async function forceRefresh() {
        currentDocId = '';
        footnotes = [];
        await loadFootnotes();
    }

    onMount(async () => {
        console.log('FootnoteDock mounted');
        await loadFootnotes();

        // 定期检查文档变化
        refreshInterval = setInterval(refreshFootnotes, 3000);

        // 监听文档切换事件
        const handleDocChange = () => {
            setTimeout(refreshFootnotes, 500);
        };

        document.addEventListener('click', handleDocChange);

        return () => {
            document.removeEventListener('click', handleDocChange);
        };
    });

    onDestroy(() => {
        console.log('FootnoteDock destroyed');
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // 清理所有Protyle实例
        protyleInstances.forEach(protyle => {
            if (protyle && protyle.destroy) {
                try {
                    protyle.destroy();
                } catch (e) {
                    console.warn('Error destroying protyle on destroy:', e);
                }
            }
        });
        protyleInstances.clear();
    });
</script>

<div class="footnote-dock" bind:this={containerElement}>
    <div class="block__icons footnote-dock__header">
        <div class="footnote-dock__title">
            {t('footnoteDock.title')}
        </div>
        <div class="footnote-dock__actions">
            <span class="footnote-dock__count">({footnotes.length})</span>
            <button
                class="footnote-dock__refresh b3-button b3-button--outline"
                on:click={forceRefresh}
                disabled={isLoading}
                title={t('footnoteDock.refresh')}
            >
                <svg><use xlink:href="#iconRefresh"></use></svg>
            </button>
        </div>
    </div>

    <div class="footnote-dock__content">
        {#if isLoading}
            <div class="footnote-dock__status">
                <svg><use xlink:href="#iconLoading"></use></svg>
                {t('footnoteDock.loading')}
            </div>
        {:else if hasError}
            <div class="footnote-dock__status footnote-dock__status--error">
                <svg><use xlink:href="#iconClose"></use></svg>
                {t('footnoteDock.error')}
            </div>
        {:else if footnotes.length === 0}
            <div class="footnote-dock__status">
                <svg><use xlink:href="#iconFile"></use></svg>
                {t('footnoteDock.empty')}
            </div>
        {:else}
            {#each footnotes as footnote, index (footnote.id)}
                <div class="footnote-item">
                    <div class="footnote-item__header">
                        <span class="footnote-item__index">[{index + 1}]</span>
                        <div class="footnote-item__ref" title={footnote.refBlockContent}>
                            {@html footnote.refBlockContent}
                        </div>
                    </div>
                    <div
                        class="footnote-item__content"
                        data-footnote-id={footnote.id}
                        use:handleProtyleMount={footnote.id}
                    ></div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .footnote-dock {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--b3-theme-background);
        font-size: 14px;
    }

    .footnote-dock__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--b3-border-color);
        background: var(--b3-theme-background);
        flex-shrink: 0;
    }

    .footnote-dock__title {
        font-weight: 500;
        color: var(--b3-theme-on-background);
    }

    .footnote-dock__actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .footnote-dock__count {
        font-size: 12px;
        color: var(--b3-theme-on-surface-light);
    }

    .footnote-dock__refresh {
        padding: 4px;
        min-width: auto;
        height: 24px;
        width: 24px;
    }

    .footnote-dock__refresh:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .footnote-dock__content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
    }

    .footnote-dock__status {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: var(--b3-theme-on-surface-light);
        padding: 40px 20px;
        font-style: italic;
        gap: 8px;
    }

    .footnote-dock__status svg {
        width: 24px;
        height: 24px;
        opacity: 0.5;
    }

    .footnote-dock__status--error {
        color: var(--b3-theme-error);
    }

    .footnote-item {
        margin-bottom: 12px;
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        background: var(--b3-theme-surface);
        overflow: hidden;
    }

    .footnote-item__header {
        padding: 6px 10px;
        border-bottom: 1px solid var(--b3-border-color);
        background: var(--b3-theme-background-light);
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 12px;
    }

    .footnote-item__index {
        font-weight: bold;
        color: var(--b3-theme-primary);
        min-width: 24px;
        font-size: 11px;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .footnote-item__ref {
        color: var(--b3-theme-on-surface);
        font-size: 11px;
        line-height: 1.4;
        flex: 1;
        overflow: hidden;
        word-break: break-word;
        max-height: 60px;
        overflow-y: auto;
    }

    .footnote-item__content {
        min-height: 80px;
        padding: 0;
        font-size: 13px;
    }
    :global(.footnote-dock .protyle) {
        min-height: 100% !important;
    }
    :global(.footnote-dock .protyle .protyle-content) {
        padding-bottom: 0!important;
    }

    :global(.footnote-item__content .protyle-wysiwyg) {
        width: 100% !important;
        min-height: 100% !important;
        padding: 0 0 !important;
        font-size: 13px !important;
        border: none !important;
        background: transparent !important;
        box-sizing: border-box;
    }

    :global(.footnote-item__content .protyle-wysiwyg .b3-typography) {
        font-size: 13px !important;
    }

    :global(.footnote-item__content .protyle) {
        background: transparent !important;
    }

    /* 隐藏不需要的protyle元素 */
    :global(.footnote-item__content .protyle-breadcrumb) {
        display: none !important;
    }

    :global(.footnote-item__content .protyle-background) {
        display: none !important;
    }

    :global(.footnote-item__content .protyle-title) {
        display: none !important;
    }
</style>
