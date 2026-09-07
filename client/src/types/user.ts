export type UserRole = "talent" | "employer";

/** Shape returned by GET /auth/showCurrentUser and embedded as `tokenUser` on login/refresh — decoded JWT payload, not a full DB read. */
export interface CurrentUser {
  name: string;
  userId: string;
  role: UserRole;
}

/** Fuller shape returned by PATCH /auth/updateUser's `user` field (createTokenUser output plus whatever the token carries). */
export interface TokenUser {
  name: string;
  userId: string;
  role: UserRole;
}
