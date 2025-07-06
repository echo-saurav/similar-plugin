import {App, PluginSettingTab, Setting} from "obsidian";
import SimilarNotesPlugin from "./main";

export class SimilarNotesSettingTab extends PluginSettingTab {
	plugin: SimilarNotesPlugin;

	constructor(app: App, plugin: SimilarNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty()

		new Setting(containerEl)
			.setName("Qdrant url")
			.setDesc("Qdrant url")
			.addText(url=>{
				url.setPlaceholder("")
					.setValue(this.plugin.settings.qdrantUrl)
					.onChange(async val => {
						this.plugin.settings.qdrantUrl = val;
						await this.plugin.saveSettings();
					})
			})

		new Setting(containerEl)
			.setName("Ollama url")
			.setDesc("Ollama url")
			.addText(url=>{
				url.setPlaceholder("")
					.setValue(this.plugin.settings.ollamaUrl)
					.onChange(async val => {
						this.plugin.settings.ollamaUrl = val;
						await this.plugin.saveSettings();
					})
			})

		new Setting(containerEl)
			.setName("Ollama model")
			.setDesc("Ollama model")
			.addText(url=>{
				url.setPlaceholder("")
					.setValue(this.plugin.settings.ollamaModel)
					.onChange(async val => {
						this.plugin.settings.ollamaModel = val;
						await this.plugin.saveSettings();
					})
			})

	}
}
