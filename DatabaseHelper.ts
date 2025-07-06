import {QdrantClient} from "@qdrant/js-client-rest";
import {Embeddings} from "./Embeddings";
import {v5 as uuidv5} from 'uuid';
import {TFile} from "obsidian";


export class QdrantDB {
	private client: QdrantClient
	private qdrantURL: string
	private ollamaURL: string
	private ollamaModel: string
	private collectionName: string
	private embeddingAPI: Embeddings


	constructor(qdrantURL: string, collectionName: string,
				ollamaUrl: string, ollamaModel: string) {
		this.qdrantURL = qdrantURL;
		this.ollamaModel = ollamaModel;
		this.ollamaURL = ollamaUrl;
		this.collectionName = collectionName;
		//
		this.embeddingAPI = new Embeddings(this.ollamaURL, this.ollamaModel);
		this.client = new QdrantClient({url: this.qdrantURL})
	}


	async init(): Promise<boolean> {
		// create collection if not exist
		return this.client.collectionExists(this.collectionName)
			.then(async exists => {
				if (exists.exists) {
					console.log("collection exists")
					return Promise.resolve(true);
				} else {
					console.log("collection doesn't exist")
					const res = await this.createCollection(this.collectionName)
					console.log(res)
					return Promise.resolve(true);
				}
			})
	}

	async createCollection(collectionName: string) {
		console.log("creating", collectionName)
		await this.client.createCollection(collectionName, {
			vectors: {
				size: 768,
				distance: 'Cosine'
			}
		})
	}

	bulkInsert(content: object[]): Promise<object> {


		return Promise.resolve({});
	}

	async delete(file: TFile) {
		const uuid= this.getUUIDFromPath(file.path)
		return  this.client.delete(this.collectionName, {
			wait: true,
			points:[uuid]
		})
	}

	async deleteAll(id: string): Promise<void> {

		await this.client.deleteCollection(this.collectionName)
		console.log("deleting", this.collectionName)
		return Promise.resolve(undefined);
	}

	doesExist(id: string): Promise<void> {
		return Promise.resolve(undefined);
	}

	async insert(content: string): Promise<void> {
		return Promise.resolve(undefined);
	}

	async query(query: string, limit: number) {
		const embedding = await this.embeddingAPI.getEmbeddings(query)

		const res = this.client.query(
			this.collectionName,
			{
				query: embedding,
				with_payload: true
			}
		)
		return res
	}

	update(id: string): Promise<void> {
		return Promise.resolve(undefined);
	}

	async upsert(content: string, file:TFile): Promise<{
		operation_id?: number | null | undefined;
		status: "acknowledged" | "completed";
	}> {


		const embedding = await this.embeddingAPI.getEmbeddings(content)
		const uuid = this.getUUIDFromPath(file.basename)


		const payload = {
			id: uuid,
			vector: embedding,
			payload: {
				path: file.path,
				name: file.basename,
				ctime: file.stat.ctime,
				mtime: file.stat.mtime,
				content: content
			}
		}

		console.log("updating", payload)

		return this.client.upsert(this.collectionName, {
			points: [payload]
		})
	}

	getUUIDFromPath(path: string) {
		const namespace = "550e8400-e29b-41d4-a716-446655440000"
		return uuidv5(path, namespace);
	}


	stripMarkdown(md: string) {
		// Remove YAML front matter
		// md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
		//
		//
		// if (md.startsWith("---")) {
		// 	md.replace(/^---\n[\s\S]*?\n---\n?/, '');
		// }

		return md
			// remove yml
			.replace(/^---\n[\s\S]*?\n---\n/, '')
			// .replace(/^---\n[\s\S]*?\n---\s*/m, '')
			// Remove code blocks
			.replace(/```[\s\S]*?```/g, '')
			// Remove inline code
			.replace(/`([^`]+)`/g, '$1')
			// Remove images (markdown + obsidian embed)
			.replace(/!\[\[.*?\]\]/g, '')
			.replace(/!\[.*?\]\(.*?\)/g, '')
			// Remove obsidian wikilinks with alias: [[page|alias]] -> alias
			.replace(/\[\[.*?\|(.*?)\]\]/g, '$1')
			// Remove simple wikilinks: [[page]]
			.replace(/\[\[(.*?)\]\]/g, '$1')
			// Remove markdown links: [text](url) -> text
			.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
			// Remove headings
			//.replace(/^#{1,6}\s*/gm, '')
			// Remove blockquotes
			.replace(/^>\s?/gm, '')
			// Remove bold/italic/emphasis
			.replace(/(\*\*|__)(.*?)\1/g, '$2')
			.replace(/(\*|_)(.*?)\1/g, '$2')
			// remove highlight
			.replace(/==(.+?)==/g, '$1')
			// Remove horizontal rules
			.replace(/^(-{3,}|\*{3,})$/gm, '')
			// Remove unordered list bullets
			// .replace(/^(\s*[-+*])\s+/gm, '')
			// Remove ordered list numbers
			// .replace(/^\s*\d+\.\s+/gm, '')
			// Remove table lines
			// .replace(/^\|.*?\|$/gm, '')
			// .replace(/^\s*:?[-| ]+:?\s*$/gm, '')
			// Handle table rows: remove pipes but keep content
			.replace(/^[-| ]{3,}$/gm, '')
			// .replace(/^\|(.+?)\|$/gm, (_, row) =>
			// 	row
			// 		.split('|')
			// 		.map((cell: string) => cell.trim())
			// 		.join(' | ')
			// )
			// remove html
			.replace(/<[^>]+>/g, '')
			// remove callouts
			.replace(/^\s*>?\s*\[\![A-Z]+\]\s*/gim, '')
			// Collapse extra newlines
			.replace(/\n{2,}/g, '\n\n')
			// remove metabind
			.replace(/^(INPUT|VIEW|BUTTON).*$/gm, '')
			.trim();
	}


	getDatabaseType(): string {
		return "qdrant"
	}

}
