export class Talk {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly author: string,
    public readonly duration: number,
    public readonly votes: number = 0
  ) {
    this.validateTitle(title)
    this.validateDescription(description)
  }

  private validateTitle(title: string): void {
    if (!title.trim()) {
      throw new Error('El título es obligatorio')
    }
    if (title.length > 50) {
      throw new Error('El título no puede exceder los 50 caracteres')
    }
  }

  private validateDescription(description: string): void {
    if (!description.trim()) {
      throw new Error('La descripción es obligatoria')
    }
    if (description.length > 400) {
      throw new Error('La descripción no puede exceder los 400 caracteres')
    }
  }
}
