import {request} from "obsidian";


export class Embeddings {
	private baseUrl: string
	private model: string
	private openaiCompatible:boolean

	constructor(baseUrl: string, model: string,
				openaiCompatible = false) {
		this.baseUrl = baseUrl;
		this.model = model;
		this.openaiCompatible = openaiCompatible;
	}

	async getEmbeddings(input: string) {

		const params = {
			url: `${this.baseUrl}/api/embed`,
			method: "POST",
			headers: {},
			body: JSON.stringify({
				input: input,
				model: this.model
			})
		}
		const res = await request(params)
		const resJson = JSON.parse(res)
		return resJson.embeddings[0]
	}

}
