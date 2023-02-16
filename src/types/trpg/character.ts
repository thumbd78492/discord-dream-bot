export type BattleCharacter = {
  name: string
  body: number
  sense: number
  mind: number
  social: number
  deck: Array<string>
  hand: Array<string>
  mana: number
  author: string
  createdTime: string
  updatedTime: string
}

export type CharacterInput = {
  name: string
  body: number // 體魄
  sense: number // 感知
  mind: number // 靈性
  social: number // 社會
}

export type CharacterInDb = {
  name: string
  body: number // 體魄
  sense: number // 感知
  mind: number // 靈性
  social: number // 社會
  cardList: Array<string>
  author: string
  createdTime: string
  updatedTime: string
}

export type CharacterUpdateDb = {
  name: string
  body: number // 體魄
  sense: number // 感知
  mind: number // 靈性
  social: number // 社會
  cardList: Array<string>
  author: string
  createdTime: string
  updatedTime: string
}
