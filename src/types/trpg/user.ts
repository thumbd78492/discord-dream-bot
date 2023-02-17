import { InvalidParameterError, invalidParameterErrorOf } from '../errors'
import { exhaustiveStringTuple } from '../exhaustiveStringTuple'
import * as E from 'fp-ts/lib/Either'
import * as TSP from 'ts-pattern'

export type UserInDb = {
  name: string
  discordId: string
  linkedCharacter?: string
  updatedTime: string
}

export type UserWithLinkedCharacter = {
  name: string
  discordId: string
  linkedCharacter: string
  updatedTime: string
}

export type CheckCategory = '體魄' | '感知' | '靈性' | '社會' | '一般'
export const ALL_CHECK_CATEGORY_TUPLE = exhaustiveStringTuple<CheckCategory>()('體魄', '感知', '靈性', '社會', '一般')
export const checkCategoryOf: (cate: string) => E.Either<InvalidParameterError, CheckCategory> = (cate) =>
  TSP.match(cate)
    .with(...ALL_CHECK_CATEGORY_TUPLE, (x) => E.right(x))
    .otherwise((x) =>
      E.left(invalidParameterErrorOf(`card category should be one of: ${ALL_CHECK_CATEGORY_TUPLE}, input: ${x}`))
    )
