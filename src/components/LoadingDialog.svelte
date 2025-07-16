<script lang="ts">
    export let message: string;
    export let progress: number = -1; // -1 表示不显示进度条
    export let progressText: string = '';
    export let details: string = '';
</script>

<div class="loading-dialog">
    <div class="loading-spinner"></div>
    <div class="loading-message">{message}</div>

    {#if progress >= 0}
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: {progress}%"></div>
            </div>
            <div class="progress-text">Step: {progressText}</div>
        </div>
    {/if}

    {#if details}
        <div class="loading-details">{details}</div>
    {/if}
</div>

<style>
    .loading-dialog {
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        min-width: 280px;
    }

    .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--b3-theme-surface-lighter);
        border-top: 3px solid var(--b3-theme-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-message {
        font-size: 14px;
        font-weight: 500;
        color: var(--b3-theme-on-background);
        text-align: center;
    }

    .progress-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .progress-bar {
        width: 100%;
        height: 8px;
        background-color: var(--b3-theme-surface-lighter);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background-color: var(--b3-theme-primary);
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .progress-text {
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        text-align: center;
    }

    .loading-details {
        font-size: 12px;
        color: var(--b3-theme-on-surface);
        text-align: center;
        opacity: 0.8;
        max-width: 250px;
        word-wrap: break-word;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
