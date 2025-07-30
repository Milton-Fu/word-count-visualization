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

        // 区间选择器
        const select = container.createEl('select');
        select.innerHTML = `
            <option value="default">默认分段</option>
            <option value="month">按月</option>
            <option value="year">按年</option>
        `;

        // 累加模式切换按钮
        const toggleCumulativeBtn = container.createEl('button', { text: '切换到累加模式' });
        let isCumulative = false;

        const refreshBtn = container.createEl('button', { text: '刷新' });

        const canvas = container.createEl('canvas');
        const renderChart = (mode: string) => {
            let labels: string[] = [];
            let data: number[] = [];
            const history = this.plugin.dailyWordHistory;
            const allDays = Object.keys(history).sort();

            if (mode === 'month') {
                const monthMap: Record<string, number> = {};
                for (const day of allDays) {
                    const month = day.slice(0, 7);
                    monthMap[month] = (monthMap[month] || 0) + history[day];
                }
                labels = Object.keys(monthMap);
                data = labels.map(m => monthMap[m]);
            } else if (mode === 'year') {
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
            if (isCumulative) {
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
                        label: isCumulative ? '累加字数' : '总字数',
                        data,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                        tension: 0.5, // 贝塞尔曲线
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: { display: true, text: isCumulative ? '累加字数统计' : '字数统计' }
                    },
                    scales: {
                        x: { title: { display: true, text: '区间' } },
                        y: { title: { display: true, text: '字数' }, beginAtZero: true }
                    }
                }
            });
        };

        // 默认渲染
        renderChart('default');

        select.onchange = () => renderChart(select.value);
        refreshBtn.onclick = () => renderChart(select.value);

        // 切换累加模式
        toggleCumulativeBtn.onclick = () => {
            isCumulative = !isCumulative;
            toggleCumulativeBtn.textContent = isCumulative ? '切换到普通模式' : '切换到累加模式';
            renderChart(select.value);
        };
    }

    async onClose() {
        // 清理工作
    }
}