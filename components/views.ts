import { ItemView, WorkspaceLeaf } from 'obsidian';
import Chart from 'chart.js/auto';
import type MyPlugin from '../main';

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
        return '笔记可视化';
    }

    getIcon() {
        return 'chart-bar';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        // 添加右上角显示笔记库总字数
        const totalWordCountEl = container.createEl('div', { cls: 'total-word-count' });
        totalWordCountEl.style.textAlign = 'right';
        totalWordCountEl.style.marginBottom = '10px';
        const updateTotalWordCount = () => {
            const totalWords = Object.values(this.plugin.dailyWordHistory).reduce((sum, count) => sum + count, 0);
            totalWordCountEl.textContent = `笔记库总字数：${totalWords}`;
        };
        await updateTotalWordCount();

        // 左侧按钮容器
        const buttonContainer = container.createEl('div', { cls: 'button-container' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '10px';

        // 区间选择器
        const select = buttonContainer.createEl('select');
        select.innerHTML = `
            <option value="default">默认分段</option>
            <option value="month">按月</option>
            <option value="year">按年</option>
        `;
        select.value = this.plugin.settings.chartMode || 'default';

        // 累加模式切换按钮
        const toggleCumulativeBtn = buttonContainer.createEl('button', { text: this.plugin.settings.isCumulative ? '切换到普通模式' : '切换到累加模式' });
        toggleCumulativeBtn.style.padding = '5px 10px';

        // 刷新按钮
        const refreshBtn = buttonContainer.createEl('button', { text: '刷新' });
        refreshBtn.style.padding = '5px 10px';

        // 图表画布
        const canvas = container.createEl('canvas');

        const renderChart = () => {
            let labels: string[] = [];
            let data: number[] = [];
            const history = this.plugin.dailyWordHistory;
            const allDays = Object.keys(history).sort();

            if (this.plugin.settings.chartMode === 'month') {
                const monthMap: Record<string, number> = {};
                for (const day of allDays) {
                    const month = day.slice(0, 7);
                    monthMap[month] = (monthMap[month] || 0) + history[day];
                }
                labels = Object.keys(monthMap);
                data = labels.map(m => monthMap[m]);
            } else if (this.plugin.settings.chartMode === 'year') {
                const yearMap: Record<string, number> = {};
                for (const day of allDays) {
                    const year = day.slice(0, 4);
                    yearMap[year] = (yearMap[year] || 0) + history[day];
                }
                labels = Object.keys(yearMap);
                data = labels.map(y => yearMap[y]);
            } else {
                // 默认分五段
                const len = allDays.length;
                const seg = Math.max(1, Math.ceil(len / 5));
                for (let i = 0; i < len; i += seg) {
                    const segDays = allDays.slice(i, i + seg);
                    labels.push(`${segDays[0]}~${segDays[segDays.length - 1]}`);
                    data.push(segDays.reduce((sum, d) => sum + history[d], 0));
                }
            }

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

            (window as any).wordChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: this.plugin.settings.isCumulative ? '累加字数' : '总字数',
                        data,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                        tension: 0.2, // 贝塞尔曲线
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: { display: true, text: this.plugin.settings.isCumulative ? '累加字数统计' : '字数统计' }
                    },
                    scales: {
                        x: { title: { display: true, text: '区间' } },
                        y: { title: { display: true, text: '字数' }, beginAtZero: true }
                    }
                }
            });
        };

        // 默认渲染
        renderChart();

        select.onchange = async () => {
            this.plugin.settings.chartMode = select.value;
            await this.plugin.saveSettings();
            renderChart();
        };

        refreshBtn.onclick = async () => {
            await updateTotalWordCount();
            renderChart();
        };

        toggleCumulativeBtn.onclick = async () => {
            this.plugin.settings.isCumulative = !this.plugin.settings.isCumulative;
            await this.plugin.saveSettings();
            toggleCumulativeBtn.textContent = this.plugin.settings.isCumulative ? '切换到普通模式' : '切换到累加模式';
            renderChart();
        };
    }

    async onClose() {
        // 清理工作
    }
}