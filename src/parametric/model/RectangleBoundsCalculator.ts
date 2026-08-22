export interface Rectangle {
	x: number
	y: number
	width: number
	height: number
}

export class RectangleBoundsCalculator {
	public calculate(
		rectangles: Iterable<Rectangle>,
		padding: number,
		minimumWidth: number,
		minimumHeight: number
	): Rectangle {
		const bounds = [...rectangles]
		const minX = Math.min(...bounds.map((bounds) => bounds.x))
		const maxX = Math.max(...bounds.map((bounds) => bounds.x + bounds.width))
		const minY = Math.min(...bounds.map((bounds) => bounds.y))
		const maxY = Math.max(...bounds.map((bounds) => bounds.y + bounds.height))
		return {
			x: minX - padding,
			y: minY - padding,
			width: Math.max(minimumWidth, maxX - minX + padding * 2),
			height: Math.max(minimumHeight, maxY - minY + padding * 2),
		}
	}
}
