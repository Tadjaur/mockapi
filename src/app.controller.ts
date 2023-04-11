import { HttpService } from '@nestjs/axios';
import { BadRequestException, Controller, Get, Param, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import axios, {AxiosError} from 'axios';
import { ApiConfig } from './services/configuration';

const gitApiHost = 'https://api.github.com';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {}

  @Get(':githubId/:repository/*')
  async getRepoPage(@Param() params:Record<string, unknown>): Promise<unknown> {
    // const config
    const url = 
      `${gitApiHost}/repos/${params.githubId}/${params.repository}/contents/.mockapi.yml`;

    const config = {
      headers: {
        "Accept": "application/vnd.github.raw"
      }
    }; 
    try {
      console.log('pre')
      const response = await axios.get(url, config);
      console.log('pre')
      
      const {errors, data} = ApiConfig.loadConfig(response.data);
      console.log('post')
      if(errors.length > 0){
        throw new BadRequestException(errors);
      }
      console.log('post')

      return data;

    } catch (err) {
      if(err instanceof AxiosError){
        throw new UnauthorizedException({message: err.message, headers: err.config.headers, url: err.config.url, data: err.response.data});
      }
      throw err
    }


    return {};
  }

}
