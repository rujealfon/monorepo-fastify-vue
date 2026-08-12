export type SessionIdentity = {
  id: string
  userId: string
}

export type ActiveSession = SessionIdentity & {
  expiresAt: Date
}
