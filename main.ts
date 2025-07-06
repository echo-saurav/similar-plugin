import {
	Plugin,
	WorkspaceLeaf,
	Notice, TFile, TAbstractFile
} from 'obsidian';
import {SimilarNotesSettingTab} from "./SimilarNotesSettingTab";
import {QdrantDB} from "./DatabaseHelper";
import {SIMILAR_VIEW_TYPE, SimilarNotesView} from "./SimilarNoteView";


interface SimilarNotesSettings {
	qdrantUrl: string
	ollamaUrl: string
	ollamaModel: string
}

const DEFAULT_SETTINGS: SimilarNotesSettings = {
	qdrantUrl: "http://192.168.0.120:6333",
	ollamaUrl: "http://192.168.0.120:11434",
	ollamaModel: "nomic-embed-text:latest"
}

export default class SimilarNotesPlugin extends Plugin {
	settings: SimilarNotesSettings;
	database: QdrantDB;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SimilarNotesSettingTab(this.app, this));
		await this.databaseInit()


		this.registerView(SIMILAR_VIEW_TYPE,
			(leaf) =>
				new SimilarNotesView(leaf, this)
		)


	}

	async databaseInit() {
		this.database = new QdrantDB(
			this.settings.qdrantUrl,
			this.app.vault.getName(),
			this.settings.ollamaUrl,
			this.settings.ollamaModel,
		)
		await this.database.init()
		this.registerCommands()

	}

	registerEvents() {
		const updateVector =
			async (file: TAbstractFile) => {
				if (file instanceof TFile) {
					const content = await this.app.vault.cachedRead(file);
					this.database.upsert(content, file)
				}
			}

		this.registerEvent(this.app.vault.on("create",
			async (file) => updateVector(file)
		))

		this.registerEvent(this.app.vault.on("modify",
			async (file) => updateVector(file)
		))

		this.registerEvent(this.app.vault.on("delete",
			async (file) => {
				if (file instanceof TFile) {
					await this.database.delete(file)
				}
			}
		))
	}

	async scanVault() {
		const files = this.app.vault.getMarkdownFiles();

		const notice = new Notice("Start rescan files", 0)

		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			const yamlRemoved = this.database.stripMarkdown(content);
			console.log(file.path)
			if (yamlRemoved.length > 0) {
				await this.database.upsert(yamlRemoved, file)
				notice.setMessage(`${file.name}`)
			}
		}
		notice.hide()

		new Notice("Done uploading files")

	}


	registerCommands() {
		this.addCommand({
			id: 'open-note-suggestion',
			name: 'Side pane',
			callback: async () => {
				await this.activeView()
			}
		})

		this.addCommand({
			id: 'scan-all-notes',
			name: 'Sync all notes',
			callback: async () => {
				await this.database.deleteAll(this.app.vault.getName())
				await this.database.createCollection(this.app.vault.getName())
				await this.scanVault()
			}
		})
	}

	async activeView() {
		let leaf: WorkspaceLeaf | null
		const leaves = this.app.workspace.getLeavesOfType(SIMILAR_VIEW_TYPE);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = this.app.workspace.getRightLeaf(false)
			await leaf?.setViewState({type: SIMILAR_VIEW_TYPE, active: true})

		}
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
	}

}


