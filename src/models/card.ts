import mongoose from 'mongoose'
import { CardInDb } from '../types/trpg/card'

const cardSchema: mongoose.Schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    cost: { type: Number, required: true },
    category: { type: String, required: true },
    dream_category: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: String, required: true },
    createdTime: { type: String, required: true },
    updatedTime: { type: String, required: true }
  },
  {
    timestamps: false
  }
)

export default mongoose.model<CardInDb>('Card', cardSchema)
