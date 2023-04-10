import { HttpService } from '@nestjs/axios';
import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import type {AxiosError} from 'axios';

const gitApiHost = 'https://api.github.com';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {}

  @Get(':githubId/:repository/*')
  async getRepoPage(@Param() params, @Res() res: Response): Promise<void> {
    // const config
    this.httpService.get(
      `${gitApiHost}/repos/${params.githubId}/${params.repository}/contents/.mockapi`,
      {
        headers: {
          "Content-Type": "application/vnd.github.raw"
        }
      },
    ).subscribe({
      next(data){
        res.status(200).send(data);
      },
      error(err:AxiosError){
        res.status(err.status ?? 400).json({message: err.message, data: err.toJSON?.call({})})
      }
    });
  }

  @Get(':gitUser/:gitRepository')
  getRepoConfig(): string {
    return this.appService.getHello();
  }
}
