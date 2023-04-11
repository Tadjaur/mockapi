import { HttpService } from '@nestjs/axios';
import {
  Logger,
  BadRequestException,
  Controller,
  Param,
  All,
  Req,
  MethodNotAllowedException
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiConfig, NotificationMethod } from './services/configuration';
import { getRawFile } from './utils/get-raw-file';

const gitApiHost = 'https://api.github.com';
const gitRowHost = 'https://raw.githubusercontent.com';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {}

  @All(':githubId/:repository/:branch/*')
  async getRepoPage(
    @Param() params: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<unknown> {
    const authorizedMethods = Object.values(NotificationMethod);
    
    if(!authorizedMethods.find(e => e == req.method.toUpperCase())){
      throw new MethodNotAllowedException();
    }
    const rawOnlyUrl = `${gitRowHost}/${params.githubId}/${params.repository}/${params.branch}/.mockapi.yml`;
    const { error, rawData } = await getRawFile(rawOnlyUrl, {});
    let rawFile = rawData;
    if (error) {
      Logger.error(`> Failed to retrieve raw data from ${gitRowHost}`, error);

      const url = `${gitApiHost}/repos/${params.githubId}/${params.repository}/contents/.mockapi.yml`;
      const config = {
        headers: {
          Accept: 'application/vnd.github.raw',
        },
      };
      const { error: error2, rawData } = await getRawFile(url, config);
      if (error2) {
        Logger.error(
          `>> Failed to retrieve raw data from ${gitApiHost}`,
          error,
        );
        throw new BadRequestException([error, error2]);
      }
      rawFile = rawData;
    }

    const { errors, data } = ApiConfig.loadConfig(rawFile);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }


    const baseUrl = params[0];
    console.log(baseUrl);
    return data;
  }
}
