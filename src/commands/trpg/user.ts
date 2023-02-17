import { CommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js'
import { SlashCommandSubCommand, slashCommandGroupOf } from '../../types/command'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import * as IO from 'fp-ts/lib/IO'
import { notFoundErrorOf } from '../../types/errors'
import * as repo from '../../repos/user'
import * as charRepo from '../../repos/character'
import { getStringField } from '../commandInteraction'

const getMe: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder().setName('me').setDescription('告訴你目前連結的角色是誰。'),
  async execute(interaction: CommandInteraction) {
    await pipe(
      interaction.user.id,
      repo.getUser,
      TE.chainW(
        TE.fromOption(() =>
          notFoundErrorOf(`你還未曾連結過角色或連結過的角色已被刪除，請使用/user bind {角色名稱}指令。`)
        )
      ),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (user) => interaction.reply(`${user.name}正使用中的角色為：${user.linkedCharacter}`)
      )
    )()
  }
}

const bind: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('bind')
    .setDescription('將你連結到一個資料庫中已儲存的角色。')
    .addStringOption((option) =>
      option
        .setName('角色名稱')
        .setDescription('(*) 角色的名稱，必須已儲存於資料庫中，詳見/character。')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      IO.Do,
      IO.apS('name', IO.of(interaction.user.username)),
      IO.apS('discordId', IO.of(interaction.user.id)),
      IO.apS('updatedTime', IO.of(new Date().toLocaleString('zh'))),
      TE.fromIO,
      TE.apS('linkedCharacter', TE.fromEither(getStringField(interaction)('角色名稱'))),
      TE.chainFirstW(({ linkedCharacter }) =>
        pipe(
          linkedCharacter,
          charRepo.getCharacter,
          TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到名稱為：${linkedCharacter}的角色。`)))
        )
      ),
      TE.chainW(repo.createOrUpdateUser),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (user) => interaction.reply(`${user.name}正使用中的角色為：${user.linkedCharacter}`)
      )
    )()
  }
}

export const userSlashCommandGroup = slashCommandGroupOf('user')('Commands that are related to the discord user.')([
  getMe,
  bind
])
