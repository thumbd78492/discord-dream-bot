import * as E from 'fp-ts/Either'
import * as TSP from 'ts-pattern'
import { InvalidParameterError, invalidParameterErrorOf } from './errors'
import { exhaustiveStringTuple } from './exhaustiveStringTuple'
import { identity, pipe } from 'fp-ts/lib/function'

export type CardInput = {
  name: string
  cost: number
  category: string
  description?: string
}

export type CardCategory = '體魄' | '感知' | '靈性' | '社會' | '衍生牌' | '狀態牌'
export const ALL_CARD_CATEGORY_TUPLE = exhaustiveStringTuple<CardCategory>()(
  '體魄',
  '感知',
  '靈性',
  '社會',
  '衍生牌',
  '狀態牌'
)
export const cardCategoryOf: (cate: string) => E.Either<InvalidParameterError, CardCategory> = (cate) =>
  TSP.match(cate)
    .with('體魄', '感知', '靈性', '社會', '衍生牌', '狀態牌', (x) => E.right(x))
    .otherwise((x) =>
      E.left(invalidParameterErrorOf(`card category should be one of: ${ALL_CARD_CATEGORY_TUPLE}, input: ${x}`))
    )

export type CardDreamCategory = '普通' | '美夢' | '惡夢'
export const ALL_CARD_DREAM_CATEGORY_TUPLE = exhaustiveStringTuple<CardDreamCategory>()('普通', '美夢', '惡夢')
export const cardDreamCategoryOf: (cate: string) => E.Either<InvalidParameterError, CardDreamCategory> = (cate) =>
  TSP.match(cate)
    .with('普通', '美夢', '惡夢', (x) => E.right(x))
    .otherwise((x) =>
      E.left(
        invalidParameterErrorOf(`card dream category should be one of: ${ALL_CARD_DREAM_CATEGORY_TUPLE}, input: ${x}`)
      )
    )

export type CardInDb = {
  name: string
  cost: number
  category: string
  dream_category: string
  description: string
  author: string
  createdTime: string
  updatedTime: string
}

export type CardUpdateDb = {
  name: string
  cost?: number
  category?: string
  dream_category?: string
  description?: string
  author: string
  updatedTime: string
}
