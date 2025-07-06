import {ItemView,  WorkspaceLeaf} from "obsidian";
import SimilarNotesPlugin from "./main";

export const SIMILAR_VIEW_TYPE = "similar-notes";

export class SimilarNotesView extends ItemView {
	listEl: HTMLElement;
	itemElement: HTMLElement
	leaf: WorkspaceLeaf;
	plugin: SimilarNotesPlugin;



	constructor(leaf: WorkspaceLeaf, plugin: SimilarNotesPlugin) {
		super(leaf);
		this.leaf = leaf
		this.plugin = plugin

		const container = this.containerEl.children[1];
		this.listEl = container.createDiv()
		this.itemElement = container.createEl("div", {cls: "side_pane_list"})
	}


	protected onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl('h4', {text: 'Example view'});

		this.registerEvent(this.app.workspace.on('file-open',
		async tfFile=>{

			if(tfFile){
				console.log("uuid",this.plugin.database.getUUIDFromPath(tfFile.path));
				const content = await this.app.vault.cachedRead(tfFile);
				const res = await this.plugin.database
					.query(this.plugin.database.stripMarkdown(content), 4)

				container.empty();
				container.createEl('h4', {text: 'Example view'});

				res.points.map(l=>{
					if(l && l.payload){
						const item = container.createEl('div', {cls: "item"})
						const path:string =l.payload['path'] || "unknown"
						const content:string =l.payload['content'] || "unknown"

						item.createEl('h4', {text: path })
						item.createEl('small', {text: content.substring(0,100)})
						// click event
						// item.addEventListener('click', () => {
						// 	this.plugin.focusFile(filepath, null)
						// })
					}

				})

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
