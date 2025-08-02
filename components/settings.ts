export interface MyPluginSettings {
    chartMode: string; // 图表模式
    isCumulative: boolean; // 是否为累加模式
    lineColor: string; // 折线图颜色
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    chartMode: 'default',
    isCumulative: false,
    lineColor: 'rgba(54, 162, 235, 1)' // 默认折线图颜色
};