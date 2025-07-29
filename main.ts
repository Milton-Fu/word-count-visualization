import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import Chart from 'chart.js/auto';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	   statusBarItemEl: HTMLElement;
	   activeLeafChangeHandler: () => void;
	   editorChangeHandler: () => void;
	   vaultWordCount: number = 0;
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
			   const ribbonIconEl = this.addRibbonIcon('dice', '字数统计', (evt: MouseEvent) => {
					   new WordChartModal(this.app, this.dailyWordHistory).open();
			   });
			   ribbonIconEl.addClass('my-plugin-ribbon-class');

			   // 状态栏字数显示
			   this.statusBarItemEl = this.addStatusBarItem();
			   this.statusBarItemEl.setText('字数：0 | 总字数：0');

			   // 监听文档切换和编辑
			   this.activeLeafChangeHandler = () => this.updateWordCount();
			   this.editorChangeHandler = () => this.updateWordCount();
			   this.registerEvent(this.app.workspace.on('active-leaf-change', this.activeLeafChangeHandler));
			   this.registerEvent(this.app.workspace.on('editor-change', this.editorChangeHandler));
			   this.registerEvent(this.app.vault.on('modify', () => this.updateVaultWordCount()));
			   this.registerEvent(this.app.vault.on('delete', () => this.updateVaultWordCount()));
			   this.registerEvent(this.app.vault.on('create', () => this.updateVaultWordCount()));

			   // 监听文件保存，记录每日字数
			   this.registerEvent(this.app.vault.on('modify', (file) => this.recordDailyWordCount()));

			   // 初始统计
			   this.updateWordCount();
			   this.updateVaultWordCount();
			   this.recordDailyWordCount();

			   // ...已将折线图弹窗绑定到图标点击事件...

			   // ...existing code...
	}

	   onunload() {
			   // 这里的事件会自动被 registerEvent 清理，无需手动移除
	   }

	   updateWordCount() {
			   const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			   let currentCount = 0;
			   if (view && view.editor) {
					   const text = view.editor.getValue();
					   currentCount = this.countWords(text);
			   }
			   this.statusBarItemEl.setText(`字数：${currentCount} | 总字数：${this.vaultWordCount}`);
	   }

	   async updateVaultWordCount() {
			   // 统计整个 Vault 的所有 md 文件字数
			   let total = 0;
			   const files = this.app.vault.getMarkdownFiles();
			   for (const file of files) {
					   const content = await this.app.vault.read(file);
					   total += this.countWords(content);
			   }
			   this.vaultWordCount = total;
			   this.updateWordCount();
	   }

	   async recordDailyWordCount() {
			   // 通过所有 md 文件的 mtime 统计每日总字数
			   const files = this.app.vault.getMarkdownFiles();
			   const dayWordMap: Record<string, number> = {};
			   for (const file of files) {
					   if (!file.stat) continue;
					   const mtime = new Date(file.stat.mtime);
					   const day = `${mtime.getFullYear()}-${(mtime.getMonth()+1).toString().padStart(2,'0')}-${mtime.getDate().toString().padStart(2,'0')}`;
					   const content = await this.app.vault.read(file);
					   const count = this.countWords(content);
					   if (!dayWordMap[day]) dayWordMap[day] = 0;
					   dayWordMap[day] += count;
			   }
			   this.dailyWordHistory = dayWordMap;
			   await this.saveSettings();
	   }

	   getToday(): string {
			   const d = new Date();
			   return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
	   }

	   countWords(text: string): number {
			   // 匹配中文、英文单词、数字
			   const matches = text.match(/([\u4e00-\u9fa5])|([a-zA-Z0-9_]+)/g);
			   return matches ? matches.length : 0;
	   }
}


// 折线图 Modal 预留
class WordChartModal extends Modal {
	   history: Record<string, number>;
	   constructor(app: App, history: Record<string, number>) {
			   super(app);
			   this.history = history;
	   }
	   onOpen() {
			   const {contentEl} = this;
			   contentEl.empty();
			   contentEl.createEl('h2', {text: '每日字数变化'});
			   const canvas = contentEl.createEl('canvas');
			   // 数据处理
			   const labels = Object.keys(this.history).sort();
			   const data = labels.map(date => this.history[date]);
			   // Chart.js 配置
			   setTimeout(() => {
					   new Chart(canvas, {
							   type: 'line',
							   data: {
									   labels,
									   datasets: [{
											   label: '总字数',
											   data,
											   borderColor: 'rgba(54, 162, 235, 1)',
											   backgroundColor: 'rgba(54, 162, 235, 0.2)',
											   fill: true,
											   tension: 0.2
									   }]
							   },
							   options: {
									   responsive: true,
									   plugins: {
											   legend: { display: true },
											   title: { display: false }
									   },
									   scales: {
											   x: { title: { display: true, text: '日期' } },
											   y: { title: { display: true, text: '字数' }, beginAtZero: true }
									   }
							   }
					   });
			   }, 0);
	   }
}
// ...existing code...


class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
