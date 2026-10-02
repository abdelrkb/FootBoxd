import type { User } from '@football-app/database';

// `avatarData` (Bytes/Buffer, potentiellement plusieurs centaines de Ko — voir schema.prisma)
// ne doit jamais partir en JSON : Prisma le sérialiserait en `{type:"Buffer",data:[...]}`,
// inutile pour le client (qui consomme `avatarUrl`, voir users.controller.ts `GET :id/avatar`)
// et très lourd sur un simple `/auth/me`.
export type PublicUser = Omit<User, 'passwordHash' | 'avatarData'>;

// Retire le hash de mot de passe et les octets de l'avatar avant de renvoyer un User au
// client — à appeler sur tout retour d'un `user.update`/`user.create` Prisma exposé par un
// contrôleur (sinon ces champs partent tels quels dans le JSON).
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, avatarData: _avatarData, ...publicUser } = user;
  return publicUser;
}
