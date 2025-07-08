import {
	Plugin,
	WorkspaceLeaf,
	Notice, TFile, TAbstractFile, debounce, PaneType
} from 'obsidian';
import {SimilarNotesSettingTab} from "./SimilarNotesSettingTab";
import {QdrantDB} from "./DatabaseHelper";
import {SIMILAR_VIEW_TYPE, SimilarNotesView} from "./SimilarNoteView";


interface SimilarNotesSettings {
	qdrantUrl: string
	ollamaUrl: string
	ollamaModel: string
	vectorSize: number
	delay: number
	score: number
	limit: number
	ignoreDirs: string[]
}


const DEFAULT_SETTINGS: SimilarNotesSettings = {
	qdrantUrl: "http://192.168.0.120:6333",
	ollamaUrl: "http://192.168.0.120:11434",
	ollamaModel: "nomic-embed-text:latest",
	vectorSize: 768,
	delay: 2000,
	score: .5,
	limit: 20,
	ignoreDirs: []
}

export default class SimilarNotesPlugin extends Plugin {
	settings: SimilarNotesSettings;
	database: QdrantDB;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SimilarNotesSettingTab(this.app, this));
		this.registerViews()
		await this.databaseInit()
		this.registerEvents()
		this.registerCommands()

		console.log('count', await this.database.count())

	}

	async databaseInit() {
		this.database = new QdrantDB(
			this.settings.qdrantUrl,
			this.app.vault.getName(),
			this.settings.ollamaUrl,
			this.settings.ollamaModel,
			this.settings.vectorSize,
			this.settings.limit,
			this.settings.score,
		)
		await this.database.init()

	}


	registerEvents() {
		this.registerEvent(this.app.vault.on("create",
			async (file) => this.delayUpdateFileVector(file)
		))

		this.registerEvent(this.app.vault.on("modify",
			async (file) => this.delayUpdateFileVector(file)
		))

		this.registerEvent(this.app.vault.on("rename",
			async (file, oldPath) => {
				await this.database.delete(oldPath)
				await this.updateVector(file)
			}
		))

		this.registerEvent(this.app.vault.on("delete",
			async (file) => {
				if (file instanceof TFile) {
					await this.database.delete(file.path)
				}
			}
		))
	}


	delayUpdateFileVector(file: TFile | TAbstractFile) {
		if (!(file instanceof TFile)) {
			return
		}

		const debounceUpdateVector = debounce(
			async (file: TFile) => {
				await this.updateVector(file)
			}, this.settings.delay, true)

		debounceUpdateVector(file)
	}

	async updateVector(file: TFile | TAbstractFile) {
		if (!(file instanceof TFile)) {
			return
		}

		if (this.isIgnoredFiles(file)) {
			const content = await this.app.vault.cachedRead(file);
			const cleanContent = this.database.stripMarkdown(content);
			if (cleanContent) {
				// update content in database
				await this.database.upsert(cleanContent, file)
			} else {
				// or delete anything in the database with this path if nothing is in the file
				await this.database.delete(file.path)
			}
		}

	}

	async scanVault() {
		const files = this.getAllFiles()
		const notice = new Notice("Start uploading files", 0)

		for (const file of files) {
			const index = files.indexOf(file);
			await this.updateVector(file)
			notice.setMessage(`${index}/${files.length} ${file.name}`)
		}


		notice.hide()
		new Notice("Done uploading files")

	}

	isIgnoredFiles(file: TFile) {
		let parentPath
		if (file.parent && file.parent.path) {
			parentPath = file.parent.path;
		}

		if (this.settings.ignoreDirs.length > 0
			&& (parentPath && this.settings.ignoreDirs.includes(parentPath))) {
			return true
		}
	}

	getAllFiles(): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const files: TFile[] = [];
		allFiles.forEach((file) => {

			if (this.isIgnoredFiles(file)) {
				files.push(file);
			}
		})
		return files;

	}

	isCurrentFileChanges(file: TFile) {
		const activeFile = this.app.workspace.getActiveFile()
		return !!(activeFile &&
			activeFile.path === file.path);

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
				new Notice("Deleting collections")
				await this.database.deleteCollection(this.app.vault.getName())
				new Notice("Recreating new collections")
				await this.database.createCollection(
					this.app.vault.getName(),
					this.settings.vectorSize
				)
				await this.scanVault()
			}
		})
	}

	registerViews() {
		this.registerView(SIMILAR_VIEW_TYPE,
			(leaf) =>
				new SimilarNotesView(leaf, this)
		)
	}


	getCurrentOpenedFile() {
		const activeFile = this.app.workspace.getActiveFile()
		if (activeFile instanceof TFile) {
			return activeFile

		} else {

			return null
		}
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

	focusFile(filePath: string, paneType: PaneType | null) {
		const targetFile = this.app.vault.getAbstractFileByPath(filePath)
		if (!targetFile) return

		if (targetFile instanceof TFile) {

			if (paneType) {
				const otherLeaf = this.app.workspace.getLeaf(paneType);
				otherLeaf?.openFile(targetFile, {active: true})

			} else {
				const currentLeaf = this.app.workspace.getMostRecentLeaf()
				currentLeaf?.openFile(targetFile, {active: true})
			}
		}
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.database.updateConfig(
			this.settings.limit,
			this.settings.score,
		)
	}

	onunload() {
	}

}


