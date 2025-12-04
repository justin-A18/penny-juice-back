import { Module } from '@nestjs/common';
import { JwtUtil } from './utils/jwt.util';
import { BcryptUtil } from './utils/bcrypt.util';

@Module({
  providers: [JwtUtil, BcryptUtil],
  exports: [JwtUtil, BcryptUtil],
})
export class CommonModule {}
