import { HttpService } from '@nestjs/axios';
import {
  Logger,
  BadRequestException,
  Controller,
  Param,
  All,
  Req,
  MethodNotAllowedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiConfig,
  NotificationMethod,
  PostApi,
} from './services/configuration';
import { getRawFile } from './utils/get-raw-file';
import type { Request } from 'express';
import {pathToRegexp} from 'path-to-regexp';
import * as path from 'path';

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

    const requestMethod = req.method.toUpperCase();

    let methodFound = false;
    for (const [method, methodConfig] of Object.entries(data.routes)) {
      if (method.toUpperCase() != requestMethod) {
        continue;
      }
      methodFound = true;
      if (!(methodConfig instanceof Array)) {
        Logger.error(
          `Invalid data type for method config. expected Array. found ${typeof methodConfig}`,
          new Error().stack,
        );
        throw new InternalServerErrorException();
      }

      const extendedPath = params['0'] as string;
      for (const pathConfig of methodConfig) {
        if (typeof pathConfig == 'string') {
          const routePath = path.join(data.apiRoutePrefix, pathConfig);
          console.log(`${extendedPath} routePath:${routePath}`);
          const locationRegexp = pathToRegexp(`${routePath}`, [], {
            sensitive: false,
            strict: false,
            end: true,
          });
          const matches = locationRegexp.exec(`/${extendedPath}`);
          console.log(`matches ${matches}`);
          if (!matches) {
            continue;
          }

          continue;
        }
        if (pathConfig instanceof PostApi) {
        }
      }
      throw new NotFoundException(
        `The requested entity was not found in the current location: ${extendedPath}`,
      );
    }

    if (!methodFound) {
      throw new MethodNotAllowedException();
    }

    return params;
  }
}
