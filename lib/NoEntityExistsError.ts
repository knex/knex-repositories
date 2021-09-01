export class NoEntityExistsError extends Error {
  public readonly filterCriteria: Record<string, any>

  constructor(message: string, filterCriteria: Record<string, any>) {
    super(message)
    this.name = 'NoEntityExistsError'
    this.filterCriteria = filterCriteria
  }
}
