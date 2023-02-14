import { SlashCommandBuilder, CommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js'
import { identity } from 'fp-ts/lib/function'

type OnListenEvent = (interaction: CommandInteraction) => Promise<void>
export type CommandExecutor = { commandName: string; execute: OnListenEvent }

export interface SlashCommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  execute: OnListenEvent
}

export interface SlashCommandSubCommand {
  data: SlashCommandSubcommandBuilder
  execute: OnListenEvent
}

export interface SlashCommandGroup {
  onListenEvents: Array<CommandExecutor>
  slashCommandBuilder: SlashCommandBuilder
}

export const slashCommandGroupOf: (
  name: string
) => (description: string) => (subcommands: Array<SlashCommandSubCommand>) => SlashCommandGroup =
  (name) => (description) => (subcommands) => {
    const slashCommandBuilder = new SlashCommandBuilder().setName(name).setDescription(description)
    subcommands.map((command) => slashCommandBuilder.addSubcommand(command.data))

    return {
      onListenEvents: subcommands.map((command) => ({
        commandName: `${name} ${command.data.name}`,
        execute: command.execute
      })),
      slashCommandBuilder
    }
  }
