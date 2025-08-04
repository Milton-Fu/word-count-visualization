import { App} from 'obsidian';

export function countWords(text: string): number {
    const matches = text.match(/([\u4e00-\u9fa5])|([a-zA-Z0-9_]+)/g);
    return matches ? matches.length : 0;
}

export async function getDailyWordHistory(app: App): Promise<Record<string, number>> {
    const files = app.vault.getMarkdownFiles();
    const dayWordMap: Record<string, number> = {};
    for (const file of files) {
        if (!file.stat) continue;
        const mtime = new Date(file.stat.mtime);
        const day = `${mtime.getFullYear()}-${(mtime.getMonth() + 1).toString().padStart(2, '0')}-${mtime.getDate().toString().padStart(2, '0')}`;
        const content = await app.vault.read(file);
        const count = countWords(content);
        if (!dayWordMap[day]) dayWordMap[day] = 0;
        dayWordMap[day] += count;
    }
    return dayWordMap;
}

export async function calcOverviewMode(startDate: Date, endDate: Date, history: Record<string, number>): Promise<{ labels: string[], data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];
    const segmentCount = 7; // 默认分段数

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const segmentLength = Math.ceil(totalDays / segmentCount);
    console.log(`Total days: ${totalDays}, Segment length: ${segmentLength}`);

    const currentDate = new Date(startDate);
    labels.push(currentDate.toISOString().split('T')[0]);
    data.push(0);
    for (let i = 1; i < segmentCount; i++) {
        const segmentEndDate = new Date(currentDate);
        segmentEndDate.setDate(currentDate.getDate() + segmentLength);
        console.log(`Segment ${i}: ${currentDate.toISOString().split('T')[0]} to ${segmentEndDate.toISOString().split('T')[0]}`);
        // 计算当前分段的字数
        const segmentDays = Object.keys(history).filter(day => {
            const dayDate = new Date(day);
            return dayDate >= currentDate && dayDate < segmentEndDate;
        });
        const segmentTotal = segmentDays.reduce((sum, day) => sum + (history[day] || 0), 0);
        labels.push(segmentEndDate.toISOString().split('T')[0]);
        data.push(segmentTotal);

        currentDate.setDate(currentDate.getDate() + segmentLength);
    }

    // 确保最后一个分段包含 endDate
    labels.push(endDate.toISOString().split('T')[0]);
    const lastSegmentDays = Object.keys(history).filter(day => {
        const dayDate = new Date(day);
        return dayDate >= currentDate && dayDate <= endDate;
    });
    const lastSegmentTotal = lastSegmentDays.reduce((sum, day) => sum + (history[day] || 0), 0);
    data.push(lastSegmentTotal);

    return { labels, data };
}

export async function calcMonthlyMode(selectedYear: number, history: Record<string, number>): Promise<{ labels: string[], data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];

    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(selectedYear, month, 1);
        const monthEnd = new Date(selectedYear, month + 1, 0); // 当前月的最后一天

        labels.push(`${selectedYear}-${(month + 1).toString().padStart(2, '0')}01`);

        // 计算当前月份的字数
        const monthDays = Object.keys(history).filter(day => {
            const dayDate = new Date(day);
            return dayDate >= monthStart && dayDate < monthEnd;
        });
        const monthTotal = monthDays.reduce((sum, day) => sum + (history[day] || 0), 0);
        data.push(monthTotal);
    }

    return { labels, data };
}

export async function calcYearlyMode(startDate: Date, endDate: Date, history: Record<string, number>): Promise<{ labels: string[], data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];

    const currentDate = new Date(startDate);
    currentDate.setMonth(0, 1); // 从每年1月1日开始
    while (currentDate <= endDate) {
        const yearStart = new Date(currentDate.getFullYear(), 0, 1);
        const yearEnd = new Date(currentDate.getFullYear(), 11, 31);

        labels.push(`${currentDate.getFullYear()}`);

        // 计算当前年份的字数
        const yearDays = Object.keys(history).filter(day => {
            const dayDate = new Date(day);
            return dayDate >= yearStart && dayDate <= yearEnd;
        });
        const yearTotal = yearDays.reduce((sum, day) => sum + (history[day] || 0), 0);
        data.push(yearTotal);

        currentDate.setFullYear(currentDate.getFullYear() + 1); // 跳到下一年
    }

    return { labels, data };
}