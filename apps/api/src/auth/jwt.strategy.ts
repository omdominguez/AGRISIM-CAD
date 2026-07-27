import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'CAMBIAR_ESTE_SECRETO_EN_PRODUCCION',
    });
  }

  async validate(payload: { sub: string; email: string; rol: string }) {
    // Lo que se retorna aquí queda disponible como request.user
    return { userId: payload.sub, email: payload.email, rol: payload.rol };
  }
}
