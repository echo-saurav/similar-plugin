import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface SimilarNotesSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: SimilarNotesSettings = {
	mySetting: 'default'
}

export default class SimilarNotesPlugin extends Plugin {
	settings: SimilarNotesSettings;

	async onload() {
		await this.loadSettings();


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SimilarNotesSettingTab extends PluginSettingTab {
	plugin: SimilarNotesPlugin;

	constructor(app: App, plugin: SimilarNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
