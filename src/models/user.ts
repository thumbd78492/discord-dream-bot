import mongoose from 'mongoose'
import { UserInDb } from '../types/trpg/user'

const userSchema: mongoose.Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    discordId: { type: String, required: true, unique: true },
    linkedCharacter: { type: String, required: true },
    updatedTime: { type: String, required: true }
  },
  {
    timestamps: false
  }
)

export default mongoose.model<UserInDb>('User', userSchema)
