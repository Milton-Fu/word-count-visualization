import { App, Editor, ItemView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, setIcon, Setting, WorkspaceLeaf } from 'obsidian';
import Chart from 'chart.js/auto';

// Remember to rename these classes and interfaces!
const VIEW_TYPE_WORD_COUNT = 'word-count-view';

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
				this.activateView();
		});
		setIcon(ribbonIconEl, 'chart-bar');

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

		this.registerView(
			VIEW_TYPE_WORD_COUNT,
			(leaf) => new WordCountView(leaf, this.dailyWordHistory)
		);

		this.addCommand({
			id: 'open-my-word-count-view',
			name: '打开我的字数统计视图',
			callback: () => {
				this.activateView();
			}
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_WORD_COUNT);
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


	countWords(text: string): number {
		// 匹配中文、英文单词、数字
		const matches = text.match(/([\u4e00-\u9fa5])|([a-zA-Z0-9_]+)/g);
		return matches ? matches.length : 0;
	}

	async activateView() {
		const leaf = this.app.workspace.getLeaf(true);
		if (!leaf) {
			// 可以根据实际情况选择抛出错误或直接返回
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


class WordCountView extends ItemView {
	history: Record<string, number>;
	constructor(leaf: WorkspaceLeaf, history: Record<string, number>) {
		super(leaf);
		this.history = history;
	}

	getViewType() {
		return 'word-count-view';
	}

	getDisplayText() {
		return 'Word Count';
	}

	getIcon() {
		return 'dice';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		const canvas = container.createEl('canvas');
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
									tension: 0.5,
									pointRadius: 0
							}]
						},
						options: {
							responsive: true,
							plugins: {
								legend: { display: true,
									position: 'center'
								},
								title: { 
									display: true,
									text: '每日字数统计'
								}
							},
							scales: {
									x: { title: { display: true, text: '日期' } },
									y: { title: { display: true, text: '字数' }, beginAtZero: true }
							}
						}
				});
		}, 0);
	}

	async onClose() {
		// 清理工作
	}
}