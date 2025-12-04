import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  ChangePasswordDto,
  LoginUserDto,
  RegisterUserDto,
  ResetPasswordDto,
} from './dto';

import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { Role } from '../users/entities/user.enum';
import { JwtUtil } from 'src/common/utils/jwt.util';
import { MailerService } from '@nestjs-modules/mailer';
import { Decoded } from 'src/common/interfaces/decoded.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly bcryptAdapter: BcryptUtil,
    private readonly jwtAdapter: JwtUtil,
  ) {}

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.usersService.findOneByEmail(email);

    const { passwordHash, ...userInfo } = user;
    const isMatch = await this.bcryptAdapter.comparePassword(
      password,
      passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const token = (await this.generateUserToken(user)) ?? '';

    return {
      message: 'Sesión iniciada con éxito',
      data: {
        user: userInfo,
        token,
      },
    };
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { name, email, password } = registerUserDto;
    const user = await this.userRepository.findOneBy({ email });

    if (user) {
      throw new BadRequestException('El email ya esta registrado');
    }

    const passwordHash = await this.bcryptAdapter.hashPassword(password);

    const newUser = this.userRepository.create({
      name,
      email,
      passwordHash,
      role: Role.USER,
    });

    await this.userRepository.save(newUser);

    const token = (await this.generateUserToken(newUser)) ?? '';
    await this.sendWelcomeEmail(newUser, token);

    return {
      message:
        '¡Te has registrado con éxito!. Te hemos enviado un correo de confirmación.',
      data: null,
    };
  }

  async changePassword(token: string, changePasswordDto: ChangePasswordDto) {
    const email = await this.checkUserToken(token);
    const user = await this.userRepository.findOneBy({ email });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    user.passwordHash = await this.bcryptAdapter.hashPassword(
      changePasswordDto.password,
    );
    await this.userRepository.update(user.id, user);

    return { message: 'Contraseña actualizada', data: null };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.userRepository.findOneBy({
      email: resetPasswordDto.email,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const token = (await this.generateUserToken(user)) ?? '';
    await this.sendPasswordResetEmail(user, token);

    return {
      message:
        '¡Tu solicitud de cambio de contraseña ha sido enviada con éxito!',
      data: null,
    };
  }

  private async generateUserToken(user: User) {
    return this.jwtAdapter.generateToken({ id: user.id, email: user.email });
  }

  private async sendWelcomeEmail(user: User, token: string) {
    await this.mailerService.sendMail({
      to: user.email,
      from: process.env.MAIL_USER,
      subject: 'Bienvenido a Penny Juice',
      html: `
        <h1>Hola ${user.name}, bienvenido a Penny Juice</h1>
        <p>Confirma tu cuenta para empezar:</p>
        <a href="${process.env.APP_URL}/register/${token}">Confirmar cuenta</a>
      `,
    });
  }

  private async sendPasswordResetEmail(user: User, token: string) {
    await this.mailerService.sendMail({
      to: user.email,
      from: process.env.MAIL_USER,
      subject: 'Cambio de contraseña',
      html: `
        <h1>Cambio de contraseña</h1>
        <p>Para cambiar tu contraseña haz click en el siguiente enlace</p>
        <a href="${process.env.APP_URL}/change-password/${token}">Cambiar contraseña</a>
      `,
    });
  }

  private async checkUserToken(token: string) {
    try {
      const { email } = await this.jwtAdapter.verifyToken<Decoded>(token);
      if (!email) throw new NotFoundException('Usuario no encontrado');
      return email;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Token inválido');
    }
  }

  async validateEmail(token: string) {
    const email = await this.checkUserToken(token);
    const user = await this.userRepository.findOneBy({ email });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    user.isEmailVerified = true;
    await this.userRepository.update(user.id, user);

    return {
      message: '¡Gracias por unirte a Penny Juice!',
      data: null,
    };
  }
}
