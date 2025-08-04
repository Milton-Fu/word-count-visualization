export type Language = 'zh-cn' | 'en';
type TranslationKey =
    | 'totalWordCount'
    | 'chartMode'
    | 'defaultSegment'
    | 'byMonth'
    | 'byYear'
    | 'cumulativeMode'
    | 'normalMode'
    | 'refresh'
    | 'cumulativeWordCount'
    | 'totalWordCountChart'
    | 'wordCountVisualization'; // 新增翻译键

type Translations = {
    [lang in Language]: Record<TranslationKey, string>;
};

export const translations: Translations = {
    'zh-cn': {
        totalWordCount: '字数',
        chartMode: '区间',
        defaultSegment: '默认分段',
        byMonth: '按月',
        byYear: '按年',
        cumulativeMode: '累加模式',
        normalMode: '普通模式',
        refresh: '刷新',
        cumulativeWordCount: '笔记库累加字数统计',
        totalWordCountChart: '笔记库字数统计',
        wordCountVisualization: '笔记库字数统计' // 新增翻译
    },
    'en': {
        totalWordCount: 'Word Count',
        chartMode: 'Interval',
        defaultSegment: 'Default Segmentation',
        byMonth: 'By Month',
        byYear: 'By Year',
        cumulativeMode: 'Cumulative Mode',
        normalMode: 'Normal Mode',
        refresh: 'Refresh',
        cumulativeWordCount: 'Cumulative Word Count',
        totalWordCountChart: 'Total Word Count Chart',
        wordCountVisualization: 'Word Count Visualization' // 新增翻译
    }
};

export function t(key: TranslationKey, language: Language): string {
    return translations[language]?.[key] || key;
}