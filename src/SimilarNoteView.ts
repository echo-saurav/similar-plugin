import {debounce, ItemView, TFile, WorkspaceLeaf} from "obsidian";
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
		container.addClass("similarNotes")
		//
		const heading = container.createEl("div", {cls: "heading"})
		heading.createEl("div", {text: "Similar Notes to"})
		this.currentFileEl = heading.createEl("div", {cls: "filename"})
		//
		const listContainer = container.createEl("div", {cls: "listContainer"})
		this.listEl = listContainer.createEl("div", {cls: "list"})
		this.statusEL = listContainer.createEl("div", {text: "", cls: "status"})
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
		if (list.length > 0) {
			this.statusEL.setText("")
		} else {
			this.statusEL.setText(`no notes found that match ${this.plugin.settings.score * 100}% similarity`)
		}

	}

	private createItem(
		item: HTMLElement,
		filename: string,
		filepath: string,
		content: string,
		score: number) {

		const head = item.createEl("div", {text: filename, cls: "filename"})
		item.createEl("div", {text: `${(score * 100).toFixed(1)}% matched`, cls: "score"})
		item.createEl("div", {text: content.substring(0,400), cls: "content"})


		head.addEventListener('click', () => {
			this.plugin.focusFile(filepath, null)
		})
		return item
	}

	async updateView(tfFile: TFile) {
		this.statusEL.setText("Searching...")
		this.currentFileEl.setText(tfFile.basename)
		//
		const content = await this.app.vault.cachedRead(tfFile);
		const res = await this.plugin.database
			.query(tfFile.path,
				this.plugin.database.stripMarkdown(content),
				this.plugin.settings.limit)


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

		this.populateList(cleanList)

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

	getViewType(): string {
		return SIMILAR_VIEW_TYPE;
	}


}
