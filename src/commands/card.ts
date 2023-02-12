import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js'
import { SlashCommand } from '../types/command'
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
} from '../types/errors'
import {
  ALL_CARD_CATEGORY_TUPLE,
  ALL_CARD_DREAM_CATEGORY_TUPLE,
  CardInput,
  cardCategoryOf,
  cardDreamCategoryOf
} from '../types/card'
import * as repo from '../repos/card'
import { numberDecoder, stringDecoder } from '../decoder'
import {
  getStringField,
  getNumberField,
  getOptionalBooleanField,
  getOptionalNumberField,
  getOptionalStringField,
  getWithDefaultStringField
} from './commandInteraction'

const getCardSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('get_card')
    .setDescription('Replies with the card information by given card name. (*) means required')
    .addStringOption((option) =>
      option.setName('card_name').setDescription('(*) The card name you want to query').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await pipe(
      getStringField(interaction)('card_name'),
      TE.fromEither,
      TE.chainW((name) =>
        pipe(name, repo.getCard, TE.chainW(TE.fromOption(() => notFoundErrorOf(`Cannot find card with name: ${name}`))))
      ),
      TE.map(lodash.pick(['name', 'cost', 'category', 'dream_category', 'description', 'createdTime', 'author'])),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (card) => interaction.reply(JSON.stringify(card, null, 2))
      )
    )()
  }
}

const getAllCardSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('get_all_card')
    .setDescription('Replies with the card name of all cards in the database'),
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

const postCardSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('post_card')
    .setDescription('create a new card to the database. (*) means required')
    .addStringOption((option) =>
      option
        .setName('card_name')
        .setDescription('(*) The card name you want to save, should be unique for whole system')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('cost')
        .setDescription('(*) The cost of the card. Should be a integer. e.x. 0, 1, 6, -1')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription(`(*) The category of the card. Should be one of "${ALL_CARD_CATEGORY_TUPLE.join('", "')}"`)
        .setChoices(...ALL_CARD_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('dream_category')
        .setDescription(
          `The card is a dream card or not. Should be one of "${ALL_CARD_DREAM_CATEGORY_TUPLE.join(
            '", "'
          )}", default is "普通"`
        )
        .setChoices(...ALL_CARD_DREAM_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('The description of the card. Default is "N/A"')
    ),
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
      TE.map(lodash.pick(['name', 'cost', 'category', 'dream_category', 'description', 'createdTime', 'author'])),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (card) => interaction.reply(JSON.stringify(card, null, 2))
      )
    )()
  }
}

const putCardSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('update_card')
    .setDescription('update a new card to the database. (*) means required')
    .addStringOption((option) =>
      option
        .setName('card_name')
        .setDescription('(*) The card name you want to update, should have been restored in the database')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('cost').setDescription('The cost of the card. Should be a integer. e.x. 0, 1, 6, -1')
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription(`The category of the card. Should be one of "${ALL_CARD_CATEGORY_TUPLE.join('", "')}"`)
        .setChoices(...ALL_CARD_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) =>
      option
        .setName('dream_category')
        .setDescription(
          `The card is a dream card or not. Should be one of "${ALL_CARD_DREAM_CATEGORY_TUPLE.join(
            '", "'
          )}", default is "普通"`
        )
        .setChoices(...ALL_CARD_DREAM_CATEGORY_TUPLE.map((x) => ({ name: x, value: x })))
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('The description of the card. Default is an empty string')
    ),
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
          TE.chainW(TE.fromOption(() => notFoundErrorOf(`Cannot find card with name: ${card.name}`)))
        )
      ),
      TE.map(
        lodash.pick([
          'name',
          'cost',
          'category',
          'dream_category',
          'description',
          'createdTime',
          'updatedTime',
          'author'
        ])
      ),
      TE.match(
        (e) => interaction.reply(`${e._tag}: ${e.msg}`),
        (card) => interaction.reply(JSON.stringify(card, null, 2))
      )
    )()
  }
}

const playCardSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('play_card')
    .setDescription('Generate play card message by given card name. (*) means required')
    .addStringOption((option) =>
      option.setName('card_name').setDescription('(*) The card name you want to query').setRequired(true)
    )
    .addIntegerOption((option) => option.setName('curr_mana').setDescription('Current mana of the player'))
    .addStringOption((option) => option.setName('player').setDescription('The name of the player'))
    .addStringOption((option) => option.setName('target').setDescription('The target of the card'))
    .addStringOption((option) => option.setName('supplementary').setDescription('The supplementary information.')),
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
        pipe(name, repo.getCard, TE.chainW(TE.fromOption(() => notFoundErrorOf(`Cannot find card with name: ${name}`))))
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

export const cardSlashCommands = [
  getCardSlashCommand,
  getAllCardSlashCommand,
  postCardSlashCommand,
  putCardSlashCommand,
  playCardSlashCommand
]
