export type GenerateAssetParams = Partial<Asset>

export type Asset = {
  userId: string
  orgId: string
  linkType: string
  name: string
}

class Counter {
  private value: number
  constructor(initialValue: number) {
    this.value = initialValue
  }

  increment(): string {
    this.value++
    return this.value.toString()
  }

  decrement(): string {
    this.value--
    return this.value.toString()
  }

  toString() {
    return this.value.toString()
  }
}

export function generateAsset(counter: Counter, params: GenerateAssetParams): Asset {
  return {
    userId: valueOrCounter(counter, params.userId),
    orgId: valueOrCounter(counter, params.orgId),
    linkType: valueOrCounter(counter, params.linkType),
    name: valueOrCounter(counter, params.name),
  }
}

export function generateAssets(
  initialCounter: number,
  params: GenerateAssetParams,
  amount: number
): Asset[] {
  const result: Asset[] = []
  const counter = new Counter(initialCounter)

  for (let x = 0; x < amount; x++) {
    result.push(generateAsset(counter, params))
  }
  return result
}

function valueOrCounter(counter: Counter, value?: string) {
  return value || counter.increment()
}
