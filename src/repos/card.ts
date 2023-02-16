import * as TE from 'fp-ts/lib/TaskEither'
import * as O from 'fp-ts/lib/Option'
import { MongoError, ParameterError, mongoErrorOf, notFoundErrorOf, parameterNotFoundErrorOf } from '../types/errors'
import CardModel from '../models/card'
import { MongooseError } from 'mongoose'
import { CardInDb, CardUpdateDb } from '../types/trpg/card'
import { pipe } from 'fp-ts/lib/function'

export const createCard: (createBody: CardInDb) => TE.TaskEither<MongoError, CardInDb> = (createBody) =>
  TE.tryCatch(
    () => CardModel.create(createBody),
    (e) => mongoErrorOf((e as MongooseError).message)
  )

export const getCard: (cardName: string) => TE.TaskEither<MongoError, O.Option<CardInDb>> = (cardName) =>
  pipe(
    TE.tryCatch(
      () => CardModel.findOne({ name: cardName }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )

export const getCardNames: () => TE.TaskEither<MongoError, string> = () =>
  pipe(
    TE.tryCatch(
      () => CardModel.find().distinct<{ name: string }>('name').exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map((x) => x.join('\n'))
  )

export const updateCard: (updateBody: CardUpdateDb) => TE.TaskEither<MongoError, O.Option<CardInDb>> = (updateBody) =>
  pipe(
    TE.tryCatch(
      () => CardModel.findOneAndUpdate({ name: updateBody.name }, updateBody, { new: true }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )

export const deleteCard: (cardName: string) => TE.TaskEither<MongoError, O.Option<CardInDb>> = (cardName) =>
  pipe(
    TE.tryCatch(
      () => CardModel.findOneAndRemove({ name: cardName }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )
