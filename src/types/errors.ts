export type EnvVarEmptyError = {
  _tag: 'EnvVarEmptyError'
  msg: string
}

export const envVarEmptyErrorOf: (msg: string) => EnvVarEmptyError = (msg) => ({
  _tag: 'EnvVarEmptyError',
  msg
})

export type BotLoginError = {
  _tag: 'BotLoginError'
  msg: string
}

export const botLoginErrorOf: (msg: string) => BotLoginError = (msg) => ({
  _tag: 'BotLoginError',
  msg
})

export type BotDeployError = {
  _tag: 'BotDeployError'
  msg: string
}

export const botDeployErrorOf: (msg: string) => BotDeployError = (msg) => ({
  _tag: 'BotDeployError',
  msg
})

export type MongoConnectError = {
  _tag: 'MongoConnectError'
  msg: string
}

export const mongoConnectErrorOf: (msg: string) => MongoConnectError = (msg) => ({
  _tag: 'MongoConnectError',
  msg
})

export type AppError = EnvVarEmptyError | BotLoginError | BotDeployError | MongoConnectError

export type InvalidParameterError = {
  _tag: 'InvalidParameterError'
  msg: string
}

export const invalidParameterErrorOf: (msg: string) => InvalidParameterError = (msg) => ({
  _tag: 'InvalidParameterError',
  msg
})

export type ParameterNotFoundError = {
  _tag: 'ParameterNotFoundError'
  msg: string
}

export const parameterNotFoundErrorOf: (msg: string) => ParameterNotFoundError = (msg) => ({
  _tag: 'ParameterNotFoundError',
  msg
})

export type ParameterError = InvalidParameterError | ParameterNotFoundError

export type MongoError = {
  _tag: 'MongoError'
  msg: string
}

export const mongoErrorOf: (msg: string) => MongoError = (msg) => ({
  _tag: 'MongoError',
  msg
})

export type MongoWarning = {
  _tag: 'MongoWarning'
  msg: string
}

export const mongoWarningOf: (msg: string) => MongoWarning = (msg) => ({
  _tag: 'MongoWarning',
  msg
})

export type NotFoundError = {
  _tag: 'NotFoundError'
  msg: string
}

export const notFoundErrorOf: (msg: string) => NotFoundError = (msg) => ({
  _tag: 'NotFoundError',
  msg
})
