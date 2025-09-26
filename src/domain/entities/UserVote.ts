export class UserVote {
  constructor(
    public readonly userId: string,
    public readonly talkId: string,
    public readonly createdAt: Date = new Date()
  ) { }
}

