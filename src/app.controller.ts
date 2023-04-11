import { HttpService } from '@nestjs/axios';
import { Controller, Get, Param, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import axios, {AxiosError} from 'axios';

const gitApiHost = 'https://api.github.com';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {}

  @Get(':githubId/:repository/*')
  async getRepoPage(@Param() params:Record<string, unknown>, @Res() res: Response): Promise<unknown> {
    // const config
    const url = 
      `${gitApiHost}/repos/${params.githubId}/${params.repository}/contents/.mockapi.yml`;

    const config = {
      headers: {
        "Accept": "application/vnd.github.raw"
      }
    }; 
    try {
      const response = await axios.get(url, config);
      const data = response.data;
      


    } catch (err) {
      if(err instanceof AxiosError){
        throw new UnauthorizedException({message: err.message, data: err.toJSON?.call({})});
      }
    }


    return {};
  }

}
