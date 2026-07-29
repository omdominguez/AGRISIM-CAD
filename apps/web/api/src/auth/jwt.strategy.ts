import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'CAMBIAR_ESTE_SECRETO_EN_PRODUCCION',
    });
  }

  async validate(payload: { sub: string; email: string; rol: string }) {
    // No basta con que el token esté bien firmado: si la base se reseteó
    // (o el usuario fue desactivado) después de emitirlo, el token sigue
    // siendo válido criptográficamente pero ya no corresponde a nadie real.
    // Verificar contra la base evita errores confusos de foreign key más
    // adelante, y da un mensaje claro de "vuelve a iniciar sesión".
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
    }

    // Lo que se retorna aquí queda disponible como request.user
    return { userId: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
