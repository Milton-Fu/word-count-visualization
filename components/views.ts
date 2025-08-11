import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import Chart from 'chart.js/auto';
import type MyPlugin from '../main';
import { t } from './i18n';
// Import Language type if it's exported from i18n or define it here
import type { Language } from './i18n';
import { calcMonthlyMode, calcOverviewMode, calcYearlyMode } from './utils';

export const VIEW_TYPE_WORD_COUNT = 'word-count-view';

export class WordCountView extends ItemView {
    plugin: MyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_WORD_COUNT;
    }

    getDisplayText() {
        const language = this.plugin.settings.language as Language;
        return t('tabName', language); // 使用多语言支持的标题
    }

    getIcon() {
        return 'chart-bar';
    }

    async onOpen() {
        const language = this.plugin.settings.language as Language;

        const container = this.containerEl.children[1];
        container.empty();

        // 顶部容器，包含总字数和按钮
        const topContainer = container.createEl('div', { cls: 'top-container' });

        // 总字数显示
        const totalWordCountEl = topContainer.createEl('div', { cls: 'total-word-count' });
        const updateTotalWordCount = () => {
            const totalWords = Object.values(this.plugin.dailyWordHistory).reduce((sum, count) => sum + count, 0);
            totalWordCountEl.textContent = `${t('totalWordCount', language)}：${totalWords.toLocaleString()} ${language === 'zh-cn' ? '字' : 'words'}`;
        };
        updateTotalWordCount();

        // 按钮容器
        const buttonContainer = topContainer.createEl('div', { cls: 'button-container' });

        // 动态生成年份选择器
        const yearSelect = buttonContainer.createEl('select', { cls: 'year-select' });
        while (yearSelect.firstChild) {
            yearSelect.removeChild(yearSelect.firstChild); // 清空年份选择器
        }
        const history = this.plugin.dailyWordHistory;
        const allDays = Object.keys(history).sort();
        const startYear = new Date(allDays[0]).getFullYear();
        const endYear = new Date(allDays[allDays.length - 1]).getFullYear();
        const selectedYear = this.plugin.settings.selectedYear || endYear;
        for (let year = startYear; year <= endYear; year++) {
            const option = yearSelect.createEl('option', { value: year.toString(), text: year.toString() });
            if (year === selectedYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
        if (this.plugin.settings.chartMode === 'month') {
            yearSelect.classList.remove('is-hidden');
                yearSelect.classList.add('is-shown');
        } else {
            yearSelect.classList.add('is-hidden');
            yearSelect.classList.remove('is-shown');
        }
        yearSelect.onchange = async () => {
            this.plugin.settings.selectedYear = parseInt(yearSelect.value, 10);
            await this.plugin.saveSettings();
            await renderChart();
        };

        // 累加模式选择器
        const cumulativeSelect = buttonContainer.createEl('select', { cls: 'cumulative-mode-select' });
        const normalOption = cumulativeSelect.createEl('option', { value: 'false', text: t('normalMode', language) });
        const cumulativeOption = cumulativeSelect.createEl('option', { value: 'true', text: t('cumulativeMode', language) });
        cumulativeSelect.appendChild(normalOption);
        cumulativeSelect.appendChild(cumulativeOption);
        cumulativeSelect.value = this.plugin.settings.isCumulative ? 'true' : 'false';

        // 区间选择器
        const select = buttonContainer.createEl('select', { cls: 'chart-mode-select' });
        const defaultOption = select.createEl('option', { value: 'default', text: t('defaultSegment', language) });
        const monthOption = select.createEl('option', { value: 'month', text: t('byMonth', language) });
        const yearOption = select.createEl('option', { value: 'year', text: t('byYear', language) });
        select.appendChild(defaultOption);
        select.appendChild(monthOption);
        select.appendChild(yearOption);
        select.value = this.plugin.settings.chartMode || 'default';

        // 如果是默认模式，强制启用累加模式并禁用累加模式选择器
        if (select.value === 'default') {
            this.plugin.settings.isCumulative = true;
            cumulativeSelect.disabled = true;
            cumulativeSelect.value = 'true'; // 强制设置为累加模式
        }

        // 刷新按钮（图标）
        const refreshBtn = buttonContainer.createEl('button', { cls: 'refresh-button' });
        setIcon(refreshBtn, 'refresh-cw'); // 使用 Obsidian 的图标

        // 图表容器
        const chartContainer = container.createEl('div', { cls: 'chart-container' });

        // 图表画布
        const canvas = chartContainer.createEl('canvas');

        // 渲染图表
        const renderChart = async () => {
            const history = this.plugin.dailyWordHistory;
            const allDays = Object.keys(history).sort();

            const startDate = new Date(allDays[0]);
            const endDate = new Date(allDays[allDays.length - 1]);

            let result;
            if (this.plugin.settings.chartMode === 'month') {
                const selectedYear = this.plugin.settings.selectedYear || startDate.getFullYear();
                result = await calcMonthlyMode(selectedYear, history);
            } else if (this.plugin.settings.chartMode === 'year') {
                result = await calcYearlyMode(startDate, endDate, history);
            } else {
                this.plugin.settings.isCumulative = true;
                result = await calcOverviewMode(startDate, endDate, history);
            }

            const { labels, data } = result;

            if (this.plugin.settings.isCumulative) {
                for (let i = 1; i < data.length; i++) {
                    data[i] += data[i - 1];
                }
            }

            if ((window as any).wordChart) {
                (window as any).wordChart.destroy();
            }

            const chartType = this.plugin.settings.isCumulative ? 'line' : 'bar';

            (window as any).wordChart = new Chart(canvas, {
                type: chartType,
                data: {
                    labels,
                    datasets: [{
                        label: this.plugin.settings.isCumulative ? t('cumulativeWordCount', language) : t('totalWordCountChart', language),
                        data,
                        borderColor: this.plugin.settings.lineColor,
                        backgroundColor: this.plugin.settings.lineColor.replace('1)', '0.3)'),
                        fill: true,
                        tension: 0.2,
                        pointRadius: this.plugin.settings.isCumulative ? 1 : 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1.7,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 60,
                            left: 10,
                            right: 10
                        }
                    },
                    scales: {
                        x: { ticks: { maxTicksLimit: labels.length } },
                        y: { beginAtZero: true }
                    }
                }
            });
        };

        // 默认渲染
        renderChart();

        select.onchange = async () => {
            this.plugin.settings.chartMode = select.value;

            // 如果是默认模式，强制启用累加模式并禁用选择器
            if (select.value === 'default') {
                this.plugin.settings.isCumulative = true;
                cumulativeSelect.disabled = true;
                cumulativeSelect.value = 'true'; // 强制设置为累加模式
            } else {
                this.plugin.settings.isCumulative = cumulativeSelect.value === 'true';
                cumulativeSelect.disabled = false;
            }

            // 动态控制年份选择器的显示和隐藏
            const yearSelect = buttonContainer.querySelector('.year-select') as HTMLSelectElement;
            if (select.value === 'month') {
                yearSelect.classList.remove('is-hidden');
                yearSelect.classList.add('is-shown');
            } else {
                yearSelect.classList.add('is-hidden');
                yearSelect.classList.remove('is-shown');
            }

            await this.plugin.saveSettings();
            await renderChart();
        };

        cumulativeSelect.onchange = async () => {
            this.plugin.settings.isCumulative = cumulativeSelect.value === 'true';
            await this.plugin.saveSettings();
            await renderChart();
        };

        refreshBtn.onclick = async () => {
            updateTotalWordCount();
            await renderChart();
        };

    }

    async onClose() {
        // 清理工作
    }
}