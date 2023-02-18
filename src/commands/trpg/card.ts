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
import {
  ALL_CARD_CATEGORY_TUPLE,
  ALL_CARD_DREAM_CATEGORY_TUPLE,
  CardInput,
  cardCategoryOf,
  cardDreamCategoryOf
} from '../../types/trpg/card'
import * as repo from '../../repos/card'
import { numberDecoder, stringDecoder } from '../../decoder'
import { CardInDb } from '../../types/trpg/card'
import {
  getStringField,
  getNumberField,
  getOptionalBooleanField,
  getOptionalNumberField,
  getOptionalStringField,
  getWithDefaultStringField
} from '../commandInteraction'
import card from '../../models/card'

const getCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('get')
    .setDescription('根據card_name，給出對應的卡片資訊。(*)代表必填。')
    .addStringOption((option) =>
      option.setName('card_name').setDescription('(*) 您想要查詢的卡名。').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      getStringField(interaction)('card_name'),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(name, repo.getCard, TE.chainW(TE.fromOption(() => notFoundErrorOf(`Cannot find card with name: ${name}`))))
      ),
      TE.map(cardEmbedder),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (embed) => interaction.reply({ embeds: [embed] })
      )
    )()
  }
}

const getAllCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('get_all')
    .setDescription('列出所有資料庫內已儲存的卡名，若需要詳細資訊，請再使用/card get {card_name}查詢。'),
  async execute(interaction: CommandInteraction) {
    await pipe(
      repo.getCardNames(),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (card) => interaction.reply(card)
      )
    )()
  }
}

const postCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('post')
    .setDescription('在資料庫中建立一張新卡片。(*)代表必填。')
    .addStringOption((option) =>
      option.setName('card_name').setDescription('(*) 新卡片的卡名，對於整個系統而言必須是唯一的。').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('cost').setDescription('(*) 新卡片的消耗，必須是一個整數。如：0, 1, 6, -1。').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription(`(*) 新卡片的種類。必須是"${ALL_CARD_CATEGORY_TUPLE.join('", "')}"的其中一種。`)
        .setChoices(...ALL_CARD_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('dream_category')
        .setDescription(
          `新卡片是否具有夢屬性。必須是"${ALL_CARD_DREAM_CATEGORY_TUPLE.join('", "')}"的其中一種。預設為"普通"。`
        )
        .setChoices(...ALL_CARD_DREAM_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) => option.setName('description').setDescription('新卡片的敘述。預設為"N/A"。')),
  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('name', getStringField(interaction)('card_name')),
      E.apS('cost', getNumberField(interaction)('cost')),
      E.apS('category', pipe(getStringField(interaction)('category'), E.chainW(cardCategoryOf))),
      E.apS(
        'dream_category',
        pipe(getWithDefaultStringField(interaction)('dream_category')('普通'), E.chainW(cardDreamCategoryOf))
      ),
      E.apS('description', getWithDefaultStringField(interaction)('description')('N/A')),
      E.apS('author', E.right(interaction.user.username)),
      E.apS('createdTime', E.right(new Date().toLocaleString('zh'))),
      E.bind('updatedTime', ({ createdTime }) => E.right(createdTime)),
      TE.fromEither,
      TE.chainW(repo.createCard),
      TE.map(cardEmbedder),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (embed) => interaction.reply({ content: '成功建立卡牌。', embeds: [embed] })
      )
    )()
  }
}

const putCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('update')
    .setDescription('從資料庫中更新一張卡片。(*)代表必填。')
    .addStringOption((option) =>
      option
        .setName('card_name')
        .setDescription('(*)您想要更新的卡片名稱，必須已被儲存在資料庫中，假如您想確認，請使用/card get_all。')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('cost').setDescription('卡片的消耗，必須是一個整數。如：0, 1, 6, -1。')
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription(`卡片的種類。必須是"${ALL_CARD_CATEGORY_TUPLE.join('", "')}"的其中一中。`)
        .setChoices(...ALL_CARD_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) =>
      option
        .setName('dream_category')
        .setDescription(
          `卡片是否具有夢屬性。必須是"${ALL_CARD_DREAM_CATEGORY_TUPLE.join('", "')}"的其中一種，預設值為"普通"。`
        )
        .setChoices(...ALL_CARD_DREAM_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) => option.setName('description').setDescription('新卡片的敘述。')),
  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('name', getStringField(interaction)('card_name')),
      E.apS('cost', pipe(getOptionalNumberField(interaction)('cost'), E.map(O.match(() => undefined, identity)))),
      E.apS(
        'category',
        pipe(
          getOptionalStringField(interaction)('category'),
          E.chainW(
            flow(O.map(cardCategoryOf), O.traverse(E.Applicative)(identity), E.map(O.match(() => undefined, identity)))
          )
        )
      ),
      E.apS(
        'dream_category',
        pipe(
          getOptionalStringField(interaction)('dream_category'),
          E.chainW(
            flow(
              O.map(cardDreamCategoryOf),
              O.traverse(E.Applicative)(identity),
              E.map(O.match(() => undefined, identity))
            )
          )
        )
      ),
      E.apS(
        'description',
        pipe(getOptionalStringField(interaction)('description'), E.map(O.match(() => undefined, identity)))
      ),
      E.apS('author', E.right(interaction.user.username)),
      E.apS('updatedTime', E.right(new Date().toLocaleString('zh'))),
      TE.fromEither,
      TE.chainW((card) =>
        pipe(
          card,
          repo.updateCard,
          TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到卡名為：${card.name}的卡片。`)))
        )
      ),
      TE.map(cardEmbedder),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (embed) => interaction.reply({ content: '成功更新卡牌。', embeds: [embed] })
      )
    )()
  }
}

const playCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('play')
    .setDescription('根據輸入的資訊，產生出牌的訊息。(*)代表必填。')
    .addStringOption((option) =>
      option
        .setName('card_name')
        .setDescription('(*) 您想要打出的卡片卡名，必須已被儲存在資料庫中，假如您想確認，請使用/card get_all。')
        .setRequired(true)
    )
    .addIntegerOption((option) => option.setName('curr_mana').setDescription('出牌玩家目前的魔力量。'))
    .addStringOption((option) => option.setName('player').setDescription('出牌玩家的名稱。'))
    .addStringOption((option) => option.setName('target').setDescription('卡牌目標的名稱。'))
    .addStringOption((option) =>
      option.setName('supplementary').setDescription('制式的出牌訊息存在許多不足，可在此補充敘述。')
    ),
  async execute(interaction: CommandInteraction) {
    const playerMsg: string = pipe(
      interaction.options.get('player', false),
      O.fromNullable,
      O.chain((x) => O.fromNullable(x.value)),
      O.chain((x) => O.fromEither(stringDecoder('player')(x))),
      O.match(
        () => ``,
        (p) => `${p}\t`
      )
    )

    const targetMsg: string = pipe(
      interaction.options.get('target', false),
      O.fromNullable,
      O.chain((x) => O.fromNullable(x.value)),
      O.chain((x) => O.fromEither(stringDecoder('target')(x))),
      O.match(
        () => ``,
        (tg) => `目標：${tg}\t`
      )
    )

    const currMana: O.Option<number> = pipe(
      interaction.options.get('curr_mana', false),
      O.fromNullable,
      O.chain((x) => O.fromNullable(x.value)),
      O.chain((x) => O.fromEither(numberDecoder('curr_mana')(x)))
    )

    const supplementary: O.Option<string> = pipe(
      interaction.options.get('supplementary', false),
      O.fromNullable,
      O.chain((x) => O.fromNullable(x.value)),
      O.chain((x) => O.fromEither(stringDecoder('supplementary')(x)))
    )

    await pipe(
      getStringField(interaction)('card_name'),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(name, repo.getCard, TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到卡名為：${name}的卡片。`))))
      ),
      TE.map(
        (card) =>
          `${playerMsg}出牌：${card.name}\t${targetMsg}\t${O.match(
            () => ``,
            (m: number) => `MANA：${m} -> ${m - card.cost}`
          )(currMana)}\n效果：${card.description}\n${O.match(
            () => ``,
            (sup) => `補充敘述：${sup}`
          )(supplementary)}`
      ),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (playMsg) => interaction.reply(playMsg)
      )
    )()
  }
}

const deleteCardSlashCommandSubCommand: SlashCommandSubCommand = {
  data: new SlashCommandSubcommandBuilder()
    .setName('delete')
    .setDescription('從資料庫中刪除一張卡片，假如刪除成功，會回應被刪除卡牌的資訊。(*)代表必填。')
    .addStringOption((option) =>
      option
        .setName('card_name')
        .setDescription('(*) 您想要刪除的卡片卡名，必須已被儲存在資料庫中，假如您想確認，請使用/card get_all。')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('delete_card_name')
        .setDescription('(*) 必須與前面的{card_name}完全一致，確認您真的想要刪除這張卡片。')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    await pipe(
      E.Do,
      E.apS('card_name', getStringField(interaction)('card_name')),
      E.apS('delete_card_name', getStringField(interaction)('delete_card_name')),
      E.chain(({ card_name, delete_card_name }) =>
        card_name === delete_card_name
          ? E.right(card_name)
          : E.left(
              invalidParameterErrorOf(
                `card_name "${card_name}"與delete_card_name "${delete_card_name}"沒有完全一致，刪除動作取消。`
              )
            )
      ),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(name, repo.deleteCard, TE.chainW(TE.fromOption(() => notFoundErrorOf(`找不到卡名為：${name}的卡片。`))))
      ),
      TE.map(cardEmbedder),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (embed) => interaction.reply({ content: '成功刪除卡牌。', embeds: [embed] })
      )
    )()
  }
}

const cardEmbedder: (card: CardInDb) => EmbedBuilder = (card) =>
  new EmbedBuilder()
    .setTitle(`${card.name} (${card.cost})`)
    .setDescription(card.description)
    .addFields({ name: '\u200B', value: '\u200B' }) // blank field
    .addFields({ name: '屬性', value: card.category, inline: true })
    .addFields({ name: '夢屬性', value: card.dream_category, inline: true })
    .addFields({ name: '\u200B', value: '\u200B' }) // blank field
    .setFooter({ text: `${card.author} last updated at ${card.updatedTime}` })
    .setColor(
      TSP.match(card.category)
        .with('體魄', () => 0x990000)
        .with('感知', () => 0x073763)
        .with('社會', () => 0xff9900)
        .with('靈性', () => 0xf7f23f)
        .with('衍生牌', () => 0x66666)
        .with('狀態牌', () => 0x38761d)
        .otherwise(() => 0x0000)
    )

export const cardSlashCommandGroup = slashCommandGroupOf('card')('Commands that are related to the card base.')([
  getCardSlashCommandSubCommand,
  getAllCardSlashCommandSubCommand,
  postCardSlashCommandSubCommand,
  putCardSlashCommandSubCommand,
  playCardSlashCommandSubCommand,
  deleteCardSlashCommandSubCommand
])
