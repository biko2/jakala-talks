export class Talk {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly author: string,
    public readonly duration: number,
    public readonly votes: number = 0
  ) { }

  addVote(): Talk {
    return new Talk(
      this.id,
      this.title,
      this.description,
      this.author,
      this.duration,
      this.votes + 1
    )
  }

  removeVote(): Talk {
    return new Talk(
      this.id,
      this.title,
      this.description,
      this.author,
      this.duration,
      Math.max(0, this.votes - 1)
    )
  }
}
