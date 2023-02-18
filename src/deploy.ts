import { DiscordAPIError, REST, Routes, SlashCommandBuilder } from 'discord.js'
import { AppConfig } from './types/config'
import { SlashCommand, SlashCommandGroup } from './types/command'
import { DeployCommandsResponse } from './types/response'
import * as S from 'fp-ts/lib/string'
import * as A from 'fp-ts/lib/Array'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import { AppError, botDeployErrorOf } from './types/errors'
import { identity, pipe, flow } from 'fp-ts/lib/function'

const conatinsOnlyDigit: (str: string) => boolean = (str) => /[0-9]+/.test(str)

export const deploySlashCommands: (
  commandList: Array<SlashCommandGroup>
) => (appConfig: AppConfig) => TE.TaskEither<AppError, RNEA.ReadonlyNonEmptyArray<DeployCommandsResponse>> =
  (commandList) => (appConfig) => {
    const rest = new REST({ version: '10' }).setToken(appConfig.discordConfig.token)
    const putPayload = commandList.map((c) => c.slashCommandBuilder.toJSON())

    return pipe(
      appConfig.discordConfig.guildId,
      S.split(','),
      RNEA.map(
        flow(
          TE.fromPredicate(conatinsOnlyDigit, (id) => botDeployErrorOf(`guildId: ${id} is invalid`)),
          TE.chain((gid) =>
            TE.tryCatch(
              () =>
                rest.put(Routes.applicationGuildCommands(appConfig.discordConfig.clientId, gid), {
                  body: putPayload
                }) as Promise<DeployCommandsResponse>,
              (r) => botDeployErrorOf(`Deploy Commands Failed: ${(r as DiscordAPIError).message}`)
            )
          )
        )
      ),
      RNEA.traverse(TE.ApplicativePar)(identity)
    )
  }
