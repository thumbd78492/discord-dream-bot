import * as TE from 'fp-ts/lib/TaskEither'
import * as O from 'fp-ts/lib/Option'
import * as A from 'fp-ts/lib/Array'
import { MongoError, MongoWarning, mongoErrorOf, mongoWarningOf } from '../types/errors'
import UserModel from '../models/user'
import { MongooseError, UpdateWriteOpResult } from 'mongoose'
import { identity, pipe } from 'fp-ts/lib/function'
import { UserInDb } from '../types/trpg/user'

export const getUser: (discordId: string) => TE.TaskEither<MongoError, O.Option<UserInDb>> = (discordId) =>
  pipe(
    TE.tryCatch(
      () => UserModel.findOne({ discordId: discordId }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    ),
    TE.map(O.fromNullable)
  )

export const createOrUpdateUser: (userBody: UserInDb) => TE.TaskEither<MongoError, UserInDb> = (userBody) =>
  pipe(
    TE.tryCatch(
      () => UserModel.findOneAndUpdate({ discordId: userBody.discordId }, userBody, { upsert: true, new: true }).exec(),
      (e) => mongoErrorOf((e as MongooseError).message)
    )
  )

export const removeLinkedCharacter: (characterName: String) => TE.TaskEither<MongoWarning, UpdateWriteOpResult> = (
  characterName
) =>
  TE.tryCatch(
    () => UserModel.updateMany({ linkedCharacter: characterName }, { $set: { linkedCharacter: undefined } }).exec(),
    (e) => mongoWarningOf((e as MongooseError).message)
  )
