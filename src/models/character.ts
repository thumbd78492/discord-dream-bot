import mongoose from 'mongoose'
import { CharacterInDb } from '../types/trpg/character'

const characterSchema: mongoose.Schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    body: { type: Number, required: true },
    sense: { type: Number, required: true },
    mind: { type: Number, required: true },
    social: { type: Number, required: true },
    cardList: { type: Array<String>, required: true },
    author: { type: String, required: true },
    createdTime: { type: String, required: true },
    updatedTime: { type: String, required: true }
  },
  {
    timestamps: false
  }
)

export default mongoose.model<CharacterInDb>('Character', characterSchema)
