import { Client, Collection, Events } from 'discord.js'
import { AppConfig } from './types/config'
import { AppError, botLoginErrorOf } from './types/errors'
import { SlashCommand, SlashCommandGroup, CommandExecutor } from './types/command'
import { DiscordjsClientLoginError } from './types/response'
import * as TE from 'fp-ts/TaskEither'
import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/lib/function'

export const loginBot: (client: Client) => (appConfig: AppConfig) => TE.TaskEither<AppError, string> =
  (client) => (appConfig) =>
    TE.tryCatch(
      () => client.login(appConfig.discordConfig.token),
      (e) => botLoginErrorOf(`Bot Login Fail: ${(e as DiscordjsClientLoginError).code}`)
    )

// export const setBotListener: (client: Client) => (commandList: Array<SlashCommand>) => void =
//   (client) => (commandList) => {
//     const commands = new Collection<string, SlashCommand>(commandList.map((c) => [c.data.name, c]))

//     client.once(Events.ClientReady, () => {
//       console.log('Bot Ready!')
//     })

//     client.on(Events.InteractionCreate, async (interaction) => {
//       if (!interaction.isChatInputCommand()) return

//       const command = commands.get(interaction.commandName)

//       if (!command) return

//       try {
//         await command.execute(interaction)
//       } catch (error) {
//         console.error(error)
//         await interaction.reply({
//           content: 'There was an error while executing this command!',
//           ephemeral: true
//         })
//       }
//     })
//   }

export const setBotListener: (client: Client) => (commandList: Array<SlashCommandGroup>) => void =
  (client) => (commandList) => {
    const commands: Collection<string, CommandExecutor> = pipe(
      commandList,
      A.map((x) => x.onListenEvents),
      A.reduce(new Array<CommandExecutor>(), (prev, curr) => prev.concat(curr)),
      (commands) => new Collection<string, CommandExecutor>(commands.map((c) => [c.commandName, c]))
    )

    client.once(Events.ClientReady, () => {
      console.log('Bot Ready!')
    })

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return

      const command = commands.get(`${interaction.commandName} ${interaction.options.data[0].name}`)

      if (!command) return

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true
        })
      }
    })
  }
