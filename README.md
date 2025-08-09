# Word Count Visualization

Word Count Visualization is an Obsidian plugin that counts the total words in your vault and visualizes your writing progress with interactive charts.

## Features

- **Word Count Statistics:** Automatically counts the words in all your Markdown files.
- **Visual Charts:** View your word count history as line or bar charts using [Chart.js](https://www.chartjs.org/).
- **Flexible Intervals:** Visualize word counts by default segments, by month, or by year.
- **Cumulative & Normal Modes:** Switch between cumulative and non-cumulative statistics.
- **Year Selection:** Filter statistics by year.
- **Customizable Appearance:** Change chart colors and plugin language (English/Chinese).
- **Refresh Button:** Instantly update your statistics and charts.

## Installation

1. Download or build the plugin files: `main.js`, `manifest.json`, and `styles.css`.
2. Copy these files to your vault's plugins folder:  
   `YourVault/.obsidian/plugins/word-count-visualization/`
3. Enable **Word Count Visualization** in Obsidian's Community Plugins settings.

## Usage

- Click the chart icon in the left ribbon to open the word count view.
- Use the dropdown menus to select chart mode (default, by month, by year), cumulative mode, and year.
- The chart and total word count will update automatically.
- Access plugin settings from Obsidian's settings panel to change language or chart color.

## Development

### Build

Make sure you have [Node.js](https://nodejs.org/) v16 or above installed.

```sh
npm install
npm run dev
```

For production build:

```sh
npm run build
```

### Project Structure

- [`main.ts`](main.ts): Main plugin entry.
- [`components/`](components/): Contains settings, i18n, chart view, and utility functions.
- [`styles.css`](styles.css): Plugin styles.
- [`manifest.json`](manifest.json): Obsidian plugin manifest.
- [`esbuild.config.mjs`](esbuild.config.mjs): Build configuration.

### Versioning

Version numbers are managed in [`manifest.json`](manifest.json) and [`versions.json`](versions.json).  
Use `npm version patch|minor|major` to bump versions and update files automatically.

## License

[MIT](LICENSE)

## Funding

If you find this plugin helpful, you can support the developer by donating through the following platforms:

- [Buy Me a Coffee](https://buymeacoffee.com/miltonfu)

Your support is greatly appreciated and helps in the continued development and maintenance of the plugin.
