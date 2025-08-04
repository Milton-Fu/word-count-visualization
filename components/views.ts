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
        return t('wordCountVisualization', language); // 使用多语言支持的标题
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
        topContainer.style.display = 'flex';
        topContainer.style.alignItems = 'center';
        topContainer.style.justifyContent = 'space-between';
        topContainer.style.marginBottom = '10px';

        // 总字数显示
        const totalWordCountEl = topContainer.createEl('div', { cls: 'total-word-count' });
        totalWordCountEl.style.fontSize = '14px';
        totalWordCountEl.style.fontWeight = 'bold'; // 设置字体加粗
        const updateTotalWordCount = () => {
            const totalWords = Object.values(this.plugin.dailyWordHistory).reduce((sum, count) => sum + count, 0);
            totalWordCountEl.textContent = `${t('totalWordCount', language)}：${totalWords.toLocaleString()} ${language === 'zh-cn' ? '字' : 'words'}`;
        };
        updateTotalWordCount();

        // 按钮容器
        const buttonContainer = topContainer.createEl('div', { cls: 'button-container' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '10px';

        // 动态生成年份选择器
        const yearSelect = buttonContainer.createEl('select', { cls: 'year-select' });
        yearSelect.style.display = 'none'; // 默认隐藏
        const history = this.plugin.dailyWordHistory;
        const allDays = Object.keys(history).sort();
        const startYear = new Date(allDays[0]).getFullYear();
        const endYear = new Date(allDays[allDays.length - 1]).getFullYear();
        for (let year = startYear; year <= endYear; year++) {
            const option = yearSelect.createEl('option', { text: year.toString(), value: year.toString() });
            if (year === (this.plugin.settings.selectedYear || startYear)) {
                option.selected = true;
            }
        }
        if (this.plugin.settings.chartMode === 'month') {
            yearSelect.style.display = 'block';
        }
        yearSelect.onchange = async () => {
            this.plugin.settings.selectedYear = parseInt(yearSelect.value, 10);
            await this.plugin.saveSettings();
            await renderChart();
        };

        // 累加模式选择器
        const cumulativeSelect = buttonContainer.createEl('select', { cls: 'cumulative-mode-select' });
        cumulativeSelect.innerHTML = `
            <option value="false">${t('normalMode', language)}</option>
            <option value="true">${t('cumulativeMode', language)}</option>
        `;
        cumulativeSelect.value = this.plugin.settings.isCumulative ? 'true' : 'false';
        setIcon(cumulativeSelect.createEl('span', { cls: 'select-icon' }), 'layers');

        // 区间选择器
        const select = buttonContainer.createEl('select', { cls: 'chart-mode-select' });
        select.innerHTML = `
            <option value="default">${t('defaultSegment', language)}</option>
            <option value="month">${t('byMonth', language)}</option>
            <option value="year">${t('byYear', language)}</option>
        `;
        select.value = this.plugin.settings.chartMode || 'default';
        setIcon(select.createEl('span', { cls: 'select-icon' }), 'calendar');

        // 刷新按钮（图标）
        const refreshBtn = buttonContainer.createEl('button', { cls: 'refresh-button' });
        setIcon(refreshBtn, 'refresh-cw'); // 使用 Obsidian 的图标
        refreshBtn.style.padding = '5px';
        refreshBtn.style.border = 'none';
        refreshBtn.style.background = 'none';
        refreshBtn.style.cursor = 'pointer';

        // 图表画布
        const canvas = container.createEl('canvas');

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
                // 默认模式强制使用累加模式
                this.plugin.settings.isCumulative = true;
                cumulativeSelect.style.display = 'none'; // 隐藏累加模式选择器
                cumulativeSelect.disabled = true; // 禁用累加模式选择器
                result = await calcOverviewMode(startDate, endDate, history);
            }

            const { labels, data } = result;

            // 如果是累加模式，转换数据为累加形式
            if (this.plugin.settings.isCumulative) {
                for (let i = 1; i < data.length; i++) {
                    data[i] += data[i - 1];
                }
            }

            // 清理旧图表
            if ((window as any).wordChart) {
                (window as any).wordChart.destroy();
            }

            // 动态设置图表类型
            const chartType = this.plugin.settings.isCumulative ? 'line' : 'bar';

            // 动态设置 x 轴最大刻度数
            const maxTicksLimit = labels.length;

            // 渲染图表
            (window as any).wordChart = new Chart(canvas, {
                type: chartType,
                data: {
                    labels,
                    datasets: [{
                        label: this.plugin.settings.isCumulative ? t('cumulativeWordCount', language) : t('totalWordCountChart', language),
                        data,
                        borderColor: this.plugin.settings.lineColor,
                        backgroundColor: this.plugin.settings.lineColor.replace('1)', '0.2)'),
                        fill: !this.plugin.settings.isCumulative, // 仅柱状图填充
                        tension: 0.2, // 贝塞尔曲线，仅折线图生效
                        pointRadius: this.plugin.settings.isCumulative ? 1 : 0 // 折线图显示点，柱状图不显示
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { 
                            display: false, 
                            text: this.plugin.settings.isCumulative 
                                ? t('cumulativeWordCount', language) 
                                : t('totalWordCountChart', language) 
                        }
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
                        x: { 
                            title: { 
                                display: true, 
                                text: t('chartMode', language) // x 轴标题
                            },
                            ticks: { maxTicksLimit } // 动态设置最大刻度数
                        },
                        y: { 
                            title: { 
                                display: true, 
                                text: t('totalWordCount', language) // y 轴标题
                            }, 
                            beginAtZero: true 
                        }
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
            } else {
                this.plugin.settings.isCumulative = cumulativeSelect.value === 'true';
                cumulativeSelect.disabled = false;
                cumulativeSelect.style.display = 'block'; // 显示累加模式选择器
            }

            // 动态控制年份选择器的显示和隐藏
            const yearSelect = buttonContainer.querySelector('.year-select') as HTMLSelectElement;
            if (select.value === 'month') {
                if (yearSelect) {
                    yearSelect.style.display = 'block';
                }
            } else {
                if (yearSelect) {
                    yearSelect.style.display = 'none';
                }
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