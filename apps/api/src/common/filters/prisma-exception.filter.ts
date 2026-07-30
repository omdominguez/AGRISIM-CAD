import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Traduce errores de Prisma/Postgres a mensajes claros. IMPORTANTE: extiende
 * BaseExceptionFilter y con @Catch() (sin argumentos) recibe TODAS las
 * excepciones — pero solo procesa las que son específicamente de Prisma.
 * Todo lo demás (errores de validación, 401, 404, etc.) se delega a
 * `super.catch()`, que es el comportamiento normal de NestJS. La versión
 * anterior usaba @Catch(TipoA, TipoB) esperando que Nest filtrara solo, pero
 * terminó interceptando peticiones que no tenían nada que ver — este es el
 * patrón correcto para "manejar un caso puntual, dejar pasar el resto".
 */
@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) {
      super.catch(exception, host);
      return;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    let status = HttpStatus.BAD_REQUEST;
    let mensaje = 'No se pudo procesar la solicitud — revisa los datos enviados.';

    switch (exception.code) {
      case 'P2000':
        mensaje = 'Uno de los valores enviados es demasiado grande para el campo correspondiente. Revisa las cifras (¿escribiste de más algún cero?).';
        break;
      case 'P2002':
        mensaje = `Ya existe un registro con ese mismo valor (${(exception.meta as any)?.target ?? 'campo único'}). No se puede duplicar.`;
        break;
      case 'P2003':
        mensaje = 'No se puede completar la acción porque otro registro todavía depende de este (por ejemplo, un lote de siembra que usa esta parcela).';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        mensaje = 'El registro que intentas modificar o borrar no existe (puede que ya se haya eliminado).';
        break;
      default:
        // Código de Prisma no mapeado explícitamente: se responde 400
        // genérico en vez de dejar pasar un 500 sin explicación.
        break;
    }

    res.status(status).json({ statusCode: status, message: mensaje, error: 'Bad Request' });
  }
}
