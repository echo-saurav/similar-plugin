import {App, Notice, PluginSettingTab, Setting} from "obsidian";
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

		new Setting(containerEl)
			.setName("Vector size")
			.setDesc("Model vector dimension size")
			.addText(vectorSize=>{
				vectorSize.setPlaceholder("")
					.setValue(`${this.plugin.settings.vectorSize}`)
					.onChange(async value => {
						if(parseInt(value)){
							this.plugin.settings.vectorSize = parseInt(value);
							await this.plugin.saveSettings();
						}else {
							vectorSize.setValue("")
							new Notice("Please provide valid vector size")
						}
					})
			})

		new Setting(containerEl)
			.setName("Score match threshold percentage")
			.setDesc("Define percentage for minimum match")
			.addText(score=>{
				score.setPlaceholder("50")
					.setValue(`${this.plugin.settings.score*100}`)
					.onChange(async value => {
						if(parseInt(value) && parseInt(value) <=100 && parseInt(value) >0 ){
							this.plugin.settings.score = parseInt(value)/100;
							await this.plugin.saveSettings();
						}else {
							score.setValue("")
							new Notice("Please provide valid vector size")
						}
					})
			})

		new Setting(containerEl)
			.setName("List limit")
			.setDesc("Max match results")
			.addText(limit=>{
				limit.setPlaceholder("")
					.setValue(`${this.plugin.settings.limit}`)
					.onChange(async value => {
						if(parseInt(value) && parseInt(value)>0){
							this.plugin.settings.limit = parseInt(value);
							await this.plugin.saveSettings();
						}else {
							limit.setValue("")
							new Notice("Please provide valid vector size")
						}
					})
			})
	}
}
