import { Plugin, PluginSettingTab, App, Setting } from 'obsidian';
import { VisualizationPluginSettings, DEFAULT_SETTINGS } from './components/settings';
import { getDailyWordHistory } from './components/utils';
import { WordCountView, VIEW_TYPE_WORD_COUNT } from './components/views';

export default class VisualizationPlugin extends Plugin {
    settings: VisualizationPluginSettings;
    dailyWordHistory: Record<string, number> = {};

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (!this.settings.selectedYear) {
            this.settings.selectedYear = new Date().getFullYear();
        }
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

        // 监听文件保存，记录每日字数
        this.registerEvent(this.app.vault.on('modify', async () => {
            this.dailyWordHistory = await getDailyWordHistory(this.app);
            await this.saveSettings();
        }));

        // 初始统计
        this.dailyWordHistory = {};
        this.app.workspace.onLayoutReady(async () => {
            this.dailyWordHistory = await getDailyWordHistory(this.app);
        });

        this.registerView(
            VIEW_TYPE_WORD_COUNT,
            leaf => new WordCountView(leaf, this)
        );

        // 添加设置页面
        this.addSettingTab(new WordCountSettingTab(this.app, this));
    }

    onunload() {
        // this.app.workspace.detachLeavesOfType(VIEW_TYPE_WORD_COUNT);
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

class WordCountSettingTab extends PluginSettingTab {
    plugin: VisualizationPlugin;

    constructor(app: App, plugin: VisualizationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        // containerEl.createEl('h2', { text: '字数统计设置 / Word Count Settings' });

        // 语言设置
        new Setting(containerEl)
            .setName('语言 / Language')
            .setDesc('选择插件的显示语言 / Select the display language of the plugin')
            .addDropdown(dropdown => 
                dropdown
                    .addOption('zh-cn', '中文')
                    .addOption('en', 'English')
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                        this.display(); // 重新渲染设置页面
                    }));

        // 折线图颜色设置
        new Setting(containerEl)
            .setName('折线图颜色 / Line Chart Color')
            .setDesc('设置折线图的颜色 / Set the color of the line chart')
            .addText(text => 
                text
                    .setPlaceholder('输入颜色 (如: rgba(54, 162, 235, 1)) / Enter color')
                    .setValue(this.plugin.settings.lineColor)
                    .onChange(async (value) => {
                        this.plugin.settings.lineColor = value;
                        await this.plugin.saveSettings();
                    }));
    }
}