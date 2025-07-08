import {debounce, IconName, ItemView, TFile, WorkspaceLeaf} from "obsidian";
import SimilarNotesPlugin from "./main";

export const SIMILAR_VIEW_TYPE = "similar-notes";

export class SimilarNotesView extends ItemView {
	listEl: HTMLElement;
	statusEL: HTMLElement
	currentFileEl: HTMLElement
	leaf: WorkspaceLeaf;
	plugin: SimilarNotesPlugin;


	constructor(leaf: WorkspaceLeaf, plugin: SimilarNotesPlugin) {
		super(leaf);
		this.leaf = leaf
		this.plugin = plugin

		// UI elements
		const container = this.containerEl.children[1];
		//container.addClass("similarNotes")
		container.addClasses(["similarNotes"]);
		//
		const heading = container.createEl("div", {cls: "heading"})
		heading.createEl("div", {text: "Similar Notes to"})
		this.currentFileEl = heading.createEl("div", {cls: "filename"})
		//
		const listContainer = container.createEl("div", {cls: "listContainer"})
		this.statusEL = listContainer.createEl("div", {text: "", cls: "status"})
		this.listEl = listContainer.createEl("div", {cls: "list"})

	}

	async updateView(tfFile: TFile) {
		if (this.plugin.isIgnoredFiles(tfFile)){
			this.listEl.empty()
			this.currentFileEl.setText(tfFile.basename)
			this.statusEL.setText(`Ignored files, please remove "${tfFile.parent?.path}" from ignored dirs in the settings if you want to include this file in the search result`)
			return
		}

		// check if note has any content for search
		this.statusEL.setText("Searching...")
		this.currentFileEl.setText(tfFile.basename)
		const fileText = await this.app.vault.cachedRead(tfFile);
		const content = this.plugin.database.stripMarkdown(fileText)
		if (content.trim().length==0) {
			this.statusEL.setText("Nothing matched for this note")
			this.listEl.empty()
			return
		}

		// search
		const res = await this.plugin.database
			.query(tfFile.path,
				content,
				this.plugin.settings.limit)


		// clean data for populating list
		const cleanList = res.points
			.map(point => {
				if (!point || !point.payload) {
					return null
				}
				return {
					name: point.payload.name,
					path: point.payload.path,
					content: point.payload.content,
					score: point.score
				}

			})


		// count result for validation
		// populate list
		if (cleanList.length > 0) {
			this.statusEL.setText(`Total ${res.points.length} results found!`)
			this.populateList(cleanList)
		} else {
			this.listEl.empty()
			this.statusEL.setText(`no notes found that match ${this.plugin.settings.score * 100}% similarity`)
		}

	}


	private populateList(list: any[]) {
		this.listEl.empty()
		list.forEach(item => {
			const itemEl = this.listEl.createEl("div", {cls: "item"})
			this.createItem(itemEl,
				item.name,
				item.path,
				item.content,
				item.score
			)
		})
	}

	private createItem(
		item: HTMLElement,
		filename: string,
		filepath: string,
		content: string,
		score: number) {

		const head = item.createEl("div", {text: filename, cls: "filename"})
		item.createEl("div", {text: `${(score * 100).toFixed(1)}% matched`, cls: "score"})
		item.createEl("div", {text: content.substring(0, 400), cls: "content"})


		head.addEventListener('click', () => {
			this.plugin.focusFile(filepath, null)
		})
		return item
	}


	protected onOpen(): Promise<void> {
		// initial
		const tfFile = this.plugin.getCurrentOpenedFile()
		if (tfFile) {
			this.updateView(tfFile)
		}

		// events
		this.registerEvent(this.app.workspace.on('file-open', async tfFile => {
			if (tfFile) {
				await this.updateView(tfFile)
			}
		}))

		this.registerEvent(this.app.vault.on('create', async file => {
			if (file instanceof TFile) {
				await this.updateView(file)
			}
		}))

		this.registerEvent(this.app.vault.on('rename', async file => {
			if (file instanceof TFile) {
				await this.updateView(file)
			}
		}))

		this.registerEvent(this.app.vault.on('delete', async file => {
			if (file instanceof TFile) {
				await this.updateView(file)
			}
		}))

		this.registerEvent(this.app.vault.on('modify', async file => {
			if (file instanceof TFile) {
				const delayUpdateView =
					debounce(async () => await this.updateView(file),
						this.plugin.settings.delay,
						true)
				delayUpdateView()

			}
		}))

		return super.onOpen();
	}


	getDisplayText(): string {
		return "Similar notes";
	}

	getIcon(): IconName {
		return "search";
	}


	getViewType(): string {
		return SIMILAR_VIEW_TYPE;
	}


}
