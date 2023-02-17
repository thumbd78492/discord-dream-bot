import { CommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js'
import { SlashCommandSubCommand, slashCommandGroupOf } from '../../types/command'
import { pipe } from 'fp-ts/lib/function'
import * as P from 'fp-ts/lib/Predicate'
import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import * as IO from 'fp-ts/lib/IO'
import * as Rnd from 'fp-ts/lib/Random'
import * as TSP from 'ts-pattern'
import { NotFoundError, notFoundErrorOf } from '../../types/errors'
import * as repo from '../../repos/user'
import * as charRepo from '../../repos/character'
import { getStringField, getWithDefaultNumberField, getWithDefaultStringField } from '../commandInteraction'
import { ALL_CHECK_CATEGORY_TUPLE, checkCategoryOf, UserInDb, UserWithLinkedCharacter } from '../../types/trpg/user'

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
      TE.chainW(checkExistLinkedCharacterName),
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

const check: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('check')
    .setDescription('根據你目前綁定的角色進行檢定。(2d6+屬性值+修正值)')
    .addStringOption((option) =>
      option
        .setName('種類')
        .setDescription(`檢定的種類。必須是"${ALL_CHECK_CATEGORY_TUPLE.join('", "')}"的其中一種。預設為"一般"。`)
        .setChoices(...ALL_CHECK_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addIntegerOption((option) =>
      option.setName('修正值').setDescription('修正值，必須是一個整數，如：0, 1, 6, -1。預設為 0。')
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('category', pipe(getWithDefaultStringField(interaction)('種類')('一般'), E.chainW(checkCategoryOf))),
      E.apS('revise', getWithDefaultNumberField(interaction)('修正值')(0)),
      TE.fromEither,
      TE.apSW(
        'user',
        pipe(
          interaction.user.id,
          repo.getUser,
          TE.chainW(
            TE.fromOption(() =>
              notFoundErrorOf(`你還未曾連結過角色或連結過的角色已被刪除，請使用/user bind {角色名稱}指令。`)
            )
          ),
          TE.chainW(checkExistLinkedCharacterName)
        )
      ),
      TE.bindW('character', ({ user }) =>
        pipe(
          charRepo.getCharacter(user.linkedCharacter),
          TE.chainW(
            TE.fromOption(() =>
              notFoundErrorOf(`找不到名稱為：${user.linkedCharacter}的角色。可能有資料庫同步上的錯誤，請回報。`)
            )
          )
        )
      ),
      TE.map((x) => {
        const dice1 = randint(1, 6)
        const dice2 = randint(1, 6)
        const abilityRevise = TSP.match(x.category)
          .with('一般', () => 0)
          .with('體魄', () => x.character.body)
          .with('感知', () => x.character.sense)
          .with('社會', () => x.character.social)
          .with('靈性', () => x.character.mind)
          .exhaustive()

        return `${x.character.name} ${x.category}檢定結果：【${dice1}+${dice2}】${dice1 + dice2}${
          x.revise === 0 ? `` : ` +【修正值】${x.revise}`
        }${abilityRevise === 0 ? `` : ` +【${x.category}】${abilityRevise}`} = ${
          dice1 + dice2 + x.revise + abilityRevise
        }`
      }),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (msg) => interaction.reply(msg)
      )
    )()
  }
}

export const userSlashCommandGroup = slashCommandGroupOf('user')('Commands that are related to the discord user.')([
  getMe,
  bind,
  check
])

const randint: (min: number, max: number) => number = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min) //The maximum is inclusive and the minimum is inclusive
}

const checkExistLinkedCharacterName: (user: UserInDb) => TE.TaskEither<NotFoundError, UserWithLinkedCharacter> = (
  user
) =>
  pipe(
    user.linkedCharacter,
    TE.fromNullable(notFoundErrorOf(`你還未曾連結過角色或連結過的角色已被刪除，請使用/user bind {角色名稱}指令。`)),
    TE.map((linkedCharacter) => ({ ...user, linkedCharacter }))
  )
