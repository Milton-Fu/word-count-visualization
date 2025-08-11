export interface VisualizationPluginSettings {
    chartMode: string; // 图表模式
    isCumulative: boolean; // 是否为累加模式
    lineColor: string; // 折线图颜色
    language: string; // 插件语言
    selectedYear: number; // 选中的年份
}

export const DEFAULT_SETTINGS: VisualizationPluginSettings = {
    chartMode: 'default',
    isCumulative: false,
    lineColor: 'rgba(54, 162, 235, 1)', // 默认折线图颜色
    language: 'zh-cn', // 默认语言为中文
    selectedYear: new Date().getFullYear() // 默认值为当前年份
};