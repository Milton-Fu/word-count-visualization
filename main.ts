import { Plugin, setIcon, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { MyPluginSettings, DEFAULT_SETTINGS } from './components/settingss';
import { countWords, getDailyWordHistory } from './components/utils';
import { WordCountView, VIEW_TYPE_WORD_COUNT } from './components/views';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    statusBarItemEl: HTMLElement;
    activeLeafChangeHandler: () => void;
    editorChangeHandler: () => void;
    dailyWordHistory: Record<string, number> = {};

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        await this.loadSettings();

        // 创建左侧栏图标
        const ribbonIconEl = this.addRibbonIcon('chart-bar', '字数统计', () => {
            this.activateView();
        });

        // 状态栏字数显示
        this.statusBarItemEl = this.addStatusBarItem();
        this.statusBarItemEl.setText('字数：0');

        // 监听文档切换和编辑
        this.activeLeafChangeHandler = () => this.updateWordCount();
        this.editorChangeHandler = () => this.updateWordCount();
        this.registerEvent(this.app.workspace.on('active-leaf-change', this.activeLeafChangeHandler));
        this.registerEvent(this.app.workspace.on('editor-change', this.editorChangeHandler));

        // 监听文件保存，记录每日字数
        this.registerEvent(this.app.vault.on('modify', async () => {
            this.dailyWordHistory = await getDailyWordHistory(this.app);
            await this.saveSettings();
        }));

        // 初始统计
        this.updateWordCount();
        this.dailyWordHistory = await getDailyWordHistory(this.app);

        this.registerView(
            VIEW_TYPE_WORD_COUNT,
            leaf => new WordCountView(leaf, this)
        );
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_WORD_COUNT);
    }

    updateWordCount() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        let currentCount = 0;
        if (view && view.editor) {
            const text = view.editor.getValue();
            currentCount = countWords(text);
        }
        this.statusBarItemEl.setText(`字数：${currentCount}`);
    }

    async activateView() {
        const leaf = this.app.workspace.getLeaf(true);
        if (!leaf) {
            console.warn('未找到右侧叶节点');
            return;
        }
        await leaf.setViewState({
            type: VIEW_TYPE_WORD_COUNT,
            active: true,
        });
        this.app.workspace.revealLeaf(leaf);
    }
}