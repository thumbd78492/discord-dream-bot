import * as TE from 'fp-ts/lib/TaskEither'
import * as O from 'fp-ts/lib/Option'
import { MongoError, ParameterError, mongoErrorOf, notFoundErrorOf, parameterNotFoundErrorOf } from '../types/errors'
import CharacterModel from '../models/character'
import { MongooseError } from 'mongoose'
import { CharacterInDb, CharacterUpdateDb } from '../types/trpg/character'
import { pipe } from 'fp-ts/lib/function'

export const createCharacter: (createBody: CharacterInDb) => TE.TaskEither<MongoError, CharacterInDb> = (createBody) =>
  TE.tryCatch(
    () => CharacterModel.create(createBody),
    (e) => mongoErrorOf((e as MongooseError).message)
  )

export const getCharacter: (cardName: string) => TE.TaskEither<MongoError, O.Option<CharacterInDb>> = (cardName) =>
  pipe(
    TE.tryCatch(
      () => CharacterModel.findOne({ name: cardName }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )

export const getCharacterNames: () => TE.TaskEither<MongoError, string> = () =>
  pipe(
    TE.tryCatch(
      () => CharacterModel.find().distinct<{ name: string }>('name').exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map((x) => x.join('\n'))
  )

export const updateCharacter: (updateBody: CharacterUpdateDb) => TE.TaskEither<MongoError, O.Option<CharacterInDb>> = (
  updateBody
) =>
  pipe(
    TE.tryCatch(
      () => CharacterModel.findOneAndUpdate({ name: updateBody.name }, updateBody, { new: true }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )

export const deleteCharacter: (cardName: string) => TE.TaskEither<MongoError, O.Option<CharacterInDb>> = (cardName) =>
  pipe(
    TE.tryCatch(
      () => CharacterModel.findOneAndRemove({ name: cardName }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )
