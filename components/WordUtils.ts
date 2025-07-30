import { App, TFile} from 'obsidian';

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