<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Protyle } from 'siyuan';
    import { sql, getBlockDOM, getDoc, openBlock } from '../api';
    import { t } from '../utils/i18n';

    export let plugin;

    let currentDocId = '';
    let footnotes = [];
    let protyleInstances = new Map();
    let containerElement;
    let refreshInterval;
    let isLoading = false;
    let hasError = false;
    // 跟踪单个脚注的折叠状态
    let collapsedFootnotes = new Set();

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

            // 获取完整文档内容
            const doc = await getDoc(docId);
            if (!doc) {
                console.error('Failed to get document:', docId);
                footnotes = [];
                hasError = true;
                isLoading = false;
                return;
            }

            // 解析文档DOM
            const currentDom = new DOMParser().parseFromString(doc.content, 'text/html');

            // 查找所有脚注引用元素 (custom-footnote 属性的元素)
            const footnoteRefs = currentDom.querySelectorAll('[custom-footnote]');
            console.log('Found footnote references:', footnoteRefs.length);

            // 确保创建新数组以触发响应式更新
            let newFootnotes = [];
            const processedIds = new Set(); // 跟踪已处理的脚注ID，避免重复

            // 按顺序处理每个脚注引用
            for (const ref of footnoteRefs) {
                const footnoteId = ref.getAttribute('custom-footnote');

                // 跳过已处理的脚注ID
                if (processedIds.has(footnoteId)) continue;
                processedIds.add(footnoteId);

                try {
                    // 获取引用这个脚注的块内容（找到包含引用的最近的块）
                    let refBlock = ref.closest('[data-node-id]');
                    let refBlockContent = '';
                    let refBlockId = '';

                    if (refBlock) {
                        refBlockId = refBlock.getAttribute('data-node-id');
                        refBlockContent = refBlock
                            ? refBlock.querySelector(
                                  `span[data-type*="custom-footnote-selected-text-${footnoteId}"]`
                              )?.textContent || ''
                            : '';
                    }
                    if (!refBlockContent) {
                        refBlockContent = refBlock
                            ? refBlock.querySelector(
                                  `span[data-type*="custom-footnote-hidden-selected-text-${footnoteId}"]`
                              )?.textContent || ''
                            : '';
                    }
                    // 如果没有找到引用块或内容为空，尝试从引用元素本身获取一些上下文
                    if (!refBlockContent) {
                        refBlockContent = refBlock.textContent;
                    }

                    // 获取脚注内容块
                    const footnoteBlock = await sql(`
                        SELECT * FROM blocks WHERE id = '${footnoteId}'
                    `);

                    if (footnoteBlock && footnoteBlock.length > 0) {
                        newFootnotes.push({
                            id: footnoteId,
                            content: footnoteBlock[0].content,
                            refBlockId: refBlockId,
                            refBlockContent: refBlockContent,
                            created: footnoteBlock[0].created,
                        });
                    } else {
                        console.warn('Footnote block not found:', footnoteId);
                    }
                } catch (error) {
                    console.warn('Error processing footnote reference:', footnoteId, error);
                }
            }

            // 使用新数组替换旧数组，确保触发响应式更新
            footnotes = newFootnotes;
            // console.log('Processed footnotes:', footnotes);
            collapseAll(); // 默认/刷新后折叠所有
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
            // console.log('Creating Protyle for footnote:', footnoteId);

            // 清空容器
            container.innerHTML = '';

            const protyle = new Protyle(window.siyuan.ws.app, container, {
                blockId: footnoteId,
                mode: 'wysiwyg',
                action: ['cb-get-focus'],
                click: {
                    preventInsetEmptyBlock: true,
                },
                render: {
                    breadcrumb: false,
                    background: false,
                    title: false,
                    gutter: false,
                },
            });

            protyleInstances.set(footnoteId, protyle);
            // console.log('Protyle created successfully for:', footnoteId);
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
                // console.log('Action directive creating protyle for:', footnoteId);
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
                // console.log('Action directive destroying protyle for:', footnoteId);
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
                console.log(
                    'Footnote count changed, refreshing...',
                    currentCount,
                    footnotes.length
                );
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

    // 折叠所有脚注
    function collapseAll() {
        // 将所有脚注ID添加到折叠集合中
        collapsedFootnotes = new Set(footnotes.map(fn => fn.id));
    }

    // 展开所有脚注
    function expandAll() {
        // 清空折叠集合
        collapsedFootnotes = new Set();
    }

    // 切换单个脚注的折叠状态
    function toggleFootnote(footnoteId) {
        const newCollapsedFootnotes = new Set(collapsedFootnotes);

        if (newCollapsedFootnotes.has(footnoteId)) {
            newCollapsedFootnotes.delete(footnoteId);
        } else {
            newCollapsedFootnotes.add(footnoteId);
        }

        collapsedFootnotes = newCollapsedFootnotes;
    }

    onMount(async () => {
        console.log('FootnoteDock mounted');
        await loadFootnotes(); // 仅在初始加载时获取一次脚注

        // 移除所有自动刷新逻辑
        // 移除定时器
        // refreshInterval = setInterval(refreshFootnotes, 3000);

        // 移除文档切换时的自动刷新
        // const handleDocChange = () => {
        //     setTimeout(async () => {
        //         const newDocId = await getCurrentDocId();
        //         if (newDocId !== currentDocId) {
        //             await loadFootnotes();
        //         }
        //     }, 500);
        // };

        // document.addEventListener('click', handleDocChange);

        // return () => {
        //     document.removeEventListener('click', handleDocChange);
        // };
    });

    onDestroy(() => {
        console.log('FootnoteDock destroyed');

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
                class="footnote-dock__collapse b3-button b3-button--outline"
                on:click={collapseAll}
                title={t('footnoteDock.collapseAll')}
                disabled={footnotes.length === 0 || isLoading}
            >
                <svg><use xlink:href="#iconContract"></use></svg>
            </button>
            <button
                class="footnote-dock__expand b3-button b3-button--outline"
                on:click={expandAll}
                title={t('footnoteDock.expandAll')}
                disabled={footnotes.length === 0 || isLoading}
            >
                <svg><use xlink:href="#iconExpand"></use></svg>
            </button>
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
                <div class="footnote-item" class:collapsed={collapsedFootnotes.has(footnote.id)}>
                    <div class="footnote-item__header">
                        <span
                            class="footnote-item__index"
                            on:click={() => openBlock(footnote.id)}
                            title={t('footnoteDock.openFootnote')}
                        >
                            [{index + 1}]
                        </span>
                        <div class="footnote-item__ref" title={footnote.refBlockContent}>
                            <!-- 添加鼠标点击事件 -->
                            <span
                                data-type="a"
                                on:click={() => openBlock(footnote.refBlockId)}
                                title={t('footnoteDock.openOriginal')}
                            >
                                {@html footnote.refBlockContent}
                            </span>
                        </div>
                        <button
                            class="footnote-item__toggle b3-button b3-button--outline"
                            on:click={() => toggleFootnote(footnote.id)}
                            title={collapsedFootnotes.has(footnote.id)
                                ? t('footnoteDock.expand')
                                : t('footnoteDock.collapse')}
                        >
                            <svg>
                                <use
                                    xlink:href={collapsedFootnotes.has(footnote.id)
                                        ? '#iconExpand'
                                        : '#iconContract'}
                                ></use>
                            </svg>
                        </button>
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

    .footnote-dock__refresh,
    .footnote-dock__collapse,
    .footnote-dock__expand {
        padding: 4px;
        min-width: auto;
        height: 24px;
        width: 24px;
    }

    .footnote-dock__refresh:disabled,
    .footnote-dock__collapse:disabled,
    .footnote-dock__expand:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .footnote-dock__content {
        flex: 1;
        overflow-y: auto;
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
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        background: var(--b3-theme-surface);
        overflow: hidden;
    }

    .footnote-item.collapsed .footnote-item__content {
        display: none;
    }

    .footnote-item__header {
        padding: 6px 10px;
        border-bottom: 1px solid var(--b3-border-color);
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
    .footnote-item__index:hover {
        cursor: pointer;
        text-decoration: underline;
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
    .footnote-item__ref:hover {
        cursor: pointer;
        text-decoration: underline;
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
        padding-bottom: 0 !important;
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

    .footnote-item__toggle {
        padding: 2px;
        min-width: auto;
        height: 20px;
        width: 20px;
        flex-shrink: 0;
        align-self: flex-start;
    }

    .footnote-item__toggle svg {
        height: 14px;
        width: 14px;
    }
</style>
