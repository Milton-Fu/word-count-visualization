export interface MyPluginSettings {
    chartMode: string; // 区间模式
    isCumulative: boolean; // 是否为累加模式
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    chartMode: 'default',
    isCumulative: false
};