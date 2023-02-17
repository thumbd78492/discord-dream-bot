import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js'
import { SlashCommand, SlashCommandSubCommand, slashCommandGroupOf } from '../../types/command'
import { pipe, flow, identity } from 'fp-ts/lib/function'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import * as TE from 'fp-ts/lib/TaskEither'
import * as TSP from 'ts-pattern'
import * as t from 'io-ts'
import * as lodash from 'lodash/fp'
import {
  ParameterError,
  invalidParameterErrorOf,
  mongoErrorOf,
  notFoundErrorOf,
  parameterNotFoundErrorOf
} from '../../types/errors'
import * as repo from '../../repos/character'
import * as userRepo from '../../repos/user'
import { numberDecoder, stringDecoder } from '../../decoder'
import { getStringField, getNumberField } from '../commandInteraction'

const getCharacter: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('get')
    .setDescription('根據角色名稱，給出對應的角色資訊。(*)代表必填。')
    .addStringOption((option) =>
      option.setName('角色名稱').setDescription('(*) 您想要查詢的角色名稱。').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      getStringField(interaction)('角色名稱'),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(name, repo.getCharacter, TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到名稱為：${name}的角色。`))))
      ),
      TE.map(
        lodash.pick(['name', 'body', 'sense', 'mind', 'social', 'cardList', 'createdTime', 'updatedTime', 'author'])
      ),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (character) => interaction.reply(JSON.stringify(character, null, 2))
      )
    )()
  }
}

const getAllCharacters: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('get_all')
    .setDescription('列出所有資料庫內已儲存的角色名稱，若需要詳細資訊，請再使用/character get {角色名稱}查詢。'),
  async execute(interaction: CommandInteraction) {
    await pipe(
      repo.getCharacterNames(),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (character) => interaction.reply(character)
      )
    )()
  }
}

const postCharacter: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('post')
    .setDescription('在資料庫中建立一筆角色資訊。(*)代表必填。')
    .addStringOption((option) =>
      option.setName('角色名稱').setDescription('(*) 角色的名稱，對於整個系統而言必須是唯一的。').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('體魄').setDescription('(*) 角色的體魄值，必須是一個正整數。如：2, 4, 6。').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('感知').setDescription('(*) 角色的感知值，必須是一個正整數。如：2, 4, 6。').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('靈性').setDescription('(*) 角色的靈性值，必須是一個正整數。如：2, 4, 6。').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('社會').setDescription('(*) 角色的社會值，必須是一個正整數。如：2, 4, 6。').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('name', getStringField(interaction)('角色名稱')),
      E.apS('body', getNumberField(interaction)('體魄')),
      E.apS('sense', getNumberField(interaction)('感知')),
      E.apS('mind', getNumberField(interaction)('靈性')),
      E.apS('social', getNumberField(interaction)('社會')),
      E.apS('cardList', E.right([])),
      E.apS('author', E.right(interaction.user.username)),
      E.apS('createdTime', E.right(new Date().toLocaleString('zh'))),
      E.bind('updatedTime', ({ createdTime }) => E.right(createdTime)),
      TE.fromEither,
      TE.chainW(repo.createCharacter),
      TE.map(lodash.pick(['name', 'body', 'sense', 'mind', 'social', 'cardList', 'createdTime', 'author'])),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (character) => interaction.reply(JSON.stringify(character, null, 2))
      )
    )()
  }
}

const deleteCharacter: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('delete')
    .setDescription('從資料庫中刪除一個角色，假如刪除成功，會回應被刪除角色的資訊。(*)代表必填。')
    .addStringOption((option) =>
      option
        .setName('角色名稱')
        .setDescription('(*) 您想要刪除的角色名稱，必須已被儲存在資料庫中，假如您想確認，請使用/card get_all。')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('刪除角色名稱')
        .setDescription('(*) 必須與前面的{角色名稱}完全一致，確認您真的想要刪除這張卡片。')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('character_name', getStringField(interaction)('角色名稱')),
      E.apS('delete_character_name', getStringField(interaction)('刪除角色名稱')),
      E.chain(({ character_name, delete_character_name }) =>
        character_name === delete_character_name
          ? E.right(character_name)
          : E.left(
              invalidParameterErrorOf(
                `角色名稱 "${character_name}"與刪除角色名稱 "${delete_character_name}"沒有完全一致，刪除動作取消。`
              )
            )
      ),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(
          name,
          repo.deleteCharacter,
          TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到名稱為：${name}的角色。`))),
          TE.chainFirstW((_) => userRepo.removeLinkedCharacter(name))
        )
      ),
      TE.map(lodash.pick(['name', 'body', 'sense', 'mind', 'social', 'cardList', 'createdTime', 'author'])),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (card) => interaction.reply('成功刪除卡牌： ' + JSON.stringify(card, null, 2))
      )
    )()
  }
}

export const characterSlashCommandGroup = slashCommandGroupOf('character')(
  'Commands that are related to the character base.'
)([getCharacter, getAllCharacters, postCharacter, deleteCharacter])
