import { CommandInteraction } from 'discord.js'
import { pipe, identity } from 'fp-ts/lib/function'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { ParameterError, parameterNotFoundErrorOf } from '../types/errors'
import { stringDecoder, booleanDecoder, numberDecoder } from '../decoder'

export const getStringField: (
  interaction: CommandInteraction
) => (fieldName: string) => E.Either<ParameterError, string> = (interaction) => (fieldName) =>
  pipe(
    E.tryCatch(
      () => interaction.options.get(fieldName, true),
      (e) => parameterNotFoundErrorOf(`${e}`)
    ),
    E.chainW((cache) => stringDecoder(fieldName)(cache.value))
  )

export const getNumberField: (
  interaction: CommandInteraction
) => (fieldName: string) => E.Either<ParameterError, number> = (interaction) => (fieldName) =>
  pipe(
    E.tryCatch(
      () => interaction.options.get(fieldName, true),
      (e) => parameterNotFoundErrorOf(`${e}`)
    ),
    E.chainW((cache) => numberDecoder(fieldName)(cache.value))
  )

export const getWithDefaultStringField: (
  interaction: CommandInteraction
) => (fieldName: string) => (defaultValue: string) => E.Either<ParameterError, string> =
  (interaction) => (fieldName) => (defaultValue) =>
    pipe(
      interaction.options.get(fieldName, false),
      O.fromNullable,
      O.map((cache) => stringDecoder(fieldName)(cache.value)),
      O.traverse(E.Applicative)(identity),
      E.map(O.match(() => defaultValue, identity))
    )

export const getWithDefaultNumberField: (
  interaction: CommandInteraction
) => (fieldName: string) => (defaultValue: number) => E.Either<ParameterError, number> =
  (interaction) => (fieldName) => (defaultValue) =>
    pipe(
      interaction.options.get(fieldName, false),
      O.fromNullable,
      O.map((cache) => numberDecoder(fieldName)(cache.value)),
      O.traverse(E.Applicative)(identity),
      E.map(O.match(() => defaultValue, identity))
    )

export const getOptionalStringField: (
  interaction: CommandInteraction
) => (fieldName: string) => E.Either<ParameterError, O.Option<string>> = (interaction) => (fieldName) =>
  pipe(
    interaction.options.get(fieldName, false),
    O.fromNullable,
    O.map((cache) => stringDecoder(fieldName)(cache.value)),
    O.traverse(E.Applicative)(identity)
  )

export const getOptionalNumberField: (
  interaction: CommandInteraction
) => (fieldName: string) => E.Either<ParameterError, O.Option<number>> = (interaction) => (fieldName) =>
  pipe(
    interaction.options.get(fieldName, false),
    O.fromNullable,
    O.map((cache) => numberDecoder(fieldName)(cache.value)),
    O.traverse(E.Applicative)(identity)
  )

export const getOptionalBooleanField: (
  interaction: CommandInteraction
) => (fieldName: string) => (defaultValue: boolean) => E.Either<ParameterError, boolean> =
  (interaction) => (fieldName) => (defaultValue) =>
    pipe(
      interaction.options.get(fieldName, false),
      O.fromNullable,
      O.map((cache) => booleanDecoder(fieldName)(cache.value)),
      O.traverse(E.Applicative)(identity),
      E.map(O.match(() => defaultValue, identity))
    )
