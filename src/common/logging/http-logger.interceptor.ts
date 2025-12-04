import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CustomLoggerService } from './logger.service';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
  };
}

interface ErrorWithStatus extends Error {
  status?: number;
}

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extract user information from request (added by JWT strategy)
    const user = request.user;

    // Extract request details
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.get('user-agent') || '';

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.logHttpRequest({
            method,
            url,
            statusCode,
            responseTime,
            userId: user?.id,
            userEmail: user?.email,
            ip,
            userAgent,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = (error as ErrorWithStatus).status || 500;

          this.logger.logHttpRequest({
            method,
            url,
            statusCode: Number(statusCode),
            responseTime,
            userId: user?.id,
            userEmail: user?.email,
            ip,
            userAgent,
          });
        },
      }),
    );
  }
}
