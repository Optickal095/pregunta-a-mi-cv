import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limits by the visitor's real IP.
 *
 * Render sits behind Cloudflare and appends to `X-Forwarded-For` without
 * cleaning it, so that header can be spoofed and its last entries change
 * between requests. Cloudflare overwrites `CF-Connecting-IP` on every request,
 * so the caller cannot fake it. Locally there is no Cloudflare and the socket
 * address is used.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const cloudflareIp = req.headers['cf-connecting-ip'];
    const ip = typeof cloudflareIp === 'string' ? cloudflareIp : req.ip;
    return Promise.resolve(ip ?? 'unknown');
  }
}
