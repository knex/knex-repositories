export class NonUniqueResultError extends Error {
  public readonly filterCriteria: Record<string, any>

  constructor(message: string, filterCriteria: Record<string, any>) {
    super(message)
    this.name = 'NonUniqueResultError'
    this.filterCriteria = filterCriteria
  }
}
