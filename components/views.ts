import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
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

        // 顶部容器，包含总字数和按钮
        const topContainer = container.createEl('div', { cls: 'top-container' });
        topContainer.style.display = 'flex';
        topContainer.style.alignItems = 'center';
        topContainer.style.justifyContent = 'space-between';
        topContainer.style.marginBottom = '10px';

        // 总字数显示
        const totalWordCountEl = topContainer.createEl('div', { cls: 'total-word-count' });
        totalWordCountEl.style.fontSize = '14px';
        const updateTotalWordCount = () => {
            const totalWords = Object.values(this.plugin.dailyWordHistory).reduce((sum, count) => sum + count, 0);
            totalWordCountEl.textContent = `笔记库总字数：${totalWords.toLocaleString()}`;
        };
        updateTotalWordCount();

        // 按钮容器
        const buttonContainer = topContainer.createEl('div', { cls: 'button-container' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '10px';

        // 区间选择器
        const select = buttonContainer.createEl('select', { cls: 'chart-mode-select' });
        select.innerHTML = `
            <option value="default">默认分段</option>
            <option value="month">按月</option>
            <option value="year">按年</option>
        `;
        select.value = this.plugin.settings.chartMode || 'default';
        setIcon(select.createEl('span', { cls: 'select-icon' }), 'calendar');

        // 累加模式选择器
        const cumulativeSelect = buttonContainer.createEl('select', { cls: 'cumulative-mode-select' });
        cumulativeSelect.innerHTML = `
            <option value="false">普通模式</option>
            <option value="true">累加模式</option>
        `;
        cumulativeSelect.value = this.plugin.settings.isCumulative ? 'true' : 'false';
        setIcon(cumulativeSelect.createEl('span', { cls: 'select-icon' }), 'layers');

        // 刷新按钮（图标）
        const refreshBtn = buttonContainer.createEl('button', { cls: 'refresh-button' });
        setIcon(refreshBtn, 'refresh-cw');
        refreshBtn.style.padding = '5px';
        refreshBtn.style.border = 'none';
        refreshBtn.style.background = 'none';
        refreshBtn.style.cursor = 'pointer';

        // 图表画布
        const canvas = container.createEl('canvas');

        const renderChart = () => {
            let labels: string[] = [];
            let data: number[] = [];
            const history = this.plugin.dailyWordHistory;
            const allDays = Object.keys(history).sort();

            // 定义切分段数和 x 轴刻度限制
            const segmentCount = 7; // 切分段数
            const maxXTicks = 7; // x 轴刻度限制

            const startDate = new Date(allDays[0]);
            const endDate = new Date(allDays[allDays.length - 1]);

            if (this.plugin.settings.chartMode === 'month') {
                // 按自然月切分
                const currentDate = new Date(startDate);
                currentDate.setDate(1); // 从每月1号开始
                while (currentDate <= endDate) {
                    labels.push(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`);
                    currentDate.setMonth(currentDate.getMonth() + 1); // 跳到下一个月
                }
            } else if (this.plugin.settings.chartMode === 'year') {
                // 按自然年切分
                const currentDate = new Date(startDate);
                currentDate.setMonth(0, 1); // 从每年1月1日开始
                while (currentDate <= endDate) {
                    labels.push(`${currentDate.getFullYear()}`);
                    currentDate.setFullYear(currentDate.getFullYear() + 1); // 跳到下一年
                }
            } else {
                // 默认分段（基于自然时间）
                const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const segmentLength = Math.ceil(totalDays / segmentCount);

                const currentDate = new Date(startDate);
                for (let i = 0; i <= segmentCount; i++) {
                    labels.push(currentDate.toISOString().split('T')[0]);
                    currentDate.setDate(currentDate.getDate() + segmentLength);
                    if (currentDate > endDate) break;
                }
            }

            // 计算每个区间的字数
            let previousDate = new Date(labels[0]);
            data.push(0); // 第一个刻度字数为零
            for (let i = 1; i < labels.length; i++) {
                const currentDate = new Date(labels[i]);
                const segmentDays = allDays.filter(day => {
                    const dayDate = new Date(day);
                    return dayDate > previousDate && dayDate <= currentDate;
                });

                const segmentTotal = segmentDays.reduce((sum, day) => sum + (history[day] || 0), 0);
                data.push(segmentTotal);
                previousDate = currentDate;
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
                        borderColor: this.plugin.settings.lineColor, // 使用用户设置的颜色
                        backgroundColor: this.plugin.settings.lineColor.replace('1)', '0.2)'), // 半透明背景色
                        fill: true,
                        tension: 0.2, // 贝塞尔曲线
                        pointRadius: 0 // 不显示点
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: this.plugin.settings.isCumulative ? '笔记库累加字数统计' : '笔记库字数统计' }
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
                            title: { display: true, text: '区间' },
                            ticks: { maxTicksLimit: maxXTicks }
                        },
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

        cumulativeSelect.onchange = async () => {
            this.plugin.settings.isCumulative = cumulativeSelect.value === 'true';
            await this.plugin.saveSettings();
            renderChart();
        };

        refreshBtn.onclick = async () => {
            updateTotalWordCount();
            renderChart();
        };
    }

    async onClose() {
        // 清理工作
    }
}