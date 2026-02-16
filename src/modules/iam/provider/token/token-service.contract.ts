export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export interface TokenService {
  signAccessToken(payload: AuthTokenPayload): Promise<string>;
}
