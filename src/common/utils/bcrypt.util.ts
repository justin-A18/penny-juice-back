import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

@Injectable()
export class BcryptUtil {
  public hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  public comparePassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }
}
