import { HttpService } from '@nestjs/axios';
import {
  Logger,
  BadRequestException,
  Controller,
  Param,
  All,
  Body,
  Req,
  MethodNotAllowedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { normalizePath } from '@nestjs/common/utils/shared.utils';
import { AppService } from './app.service';
import {
  ApiConfig,
  MockApiConfig,
  NotificationMethod,
  PostApi,
} from './services/configuration';
import { getRawFile } from './utils/get-raw-file';
import type { Request } from 'express';
import { pathToRegexp } from 'path-to-regexp';
import * as path from 'path';
import { config } from 'process';
import { getSubRecordFromRoot } from './utils/util';
import axios from 'axios';

const configFileName = '.mockapi.yml';
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
    @Body() requestBody: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<unknown> {
    const repoRootUrl1 = `${gitRowHost}/${params.githubId}/${params.repository}/${params.branch}`;
    const repoRootUrl2 = `${gitApiHost}/repos/${params.githubId}/${params.repository}/contents`;

    const { errors: configErrors, rawData } = await getRawFile([
      { url: `${repoRootUrl1}/${configFileName}`, urlConfig: {} },
      {
        url: `${repoRootUrl2}/${configFileName}`,
        urlConfig: {
          headers: {
            Accept: 'application/vnd.github.raw',
          },
        },
      },
    ]);
    let rawFile = rawData;
    if (configErrors) {
      Logger.error(
        `> Failed to retrieve raw data from ${gitRowHost}.`,
        configErrors,
      );
      throw new BadRequestException(configErrors);
    }

    const { errors, data: configData } = ApiConfig.loadConfig(rawFile);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const requestMethod = req.method.toUpperCase();

    let methodFound = false;
    for (const [method, methodConfig] of Object.entries(configData.routes)) {
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

      const extendedPath = normalizePath(params['0'] as string);
      for (const pathConfig of methodConfig) {
        if (typeof pathConfig == 'string') {
          const routePath = path.join(configData.apiRoutePrefix, pathConfig);
          const locationRegexp = pathToRegexp(normalizePath(routePath), [], {
            sensitive: false,
            strict: false,
            end: true,
          });
          const matches = locationRegexp.exec(extendedPath);
          if (!matches) {
            continue;
          }

          const requestedData = await this.getRequestedData(
            extendedPath,
            configData,
            repoRootUrl1,
            repoRootUrl2,
          );
          if (!requestedData) {
            throw new NotFoundException();
          }
          return requestedData;
        }
        if (pathConfig instanceof PostApi) {
          const routePath = path.join(
            configData.apiRoutePrefix,
            pathConfig.path,
          );
          const locationRegexp = pathToRegexp(normalizePath(routePath), [], {
            sensitive: false,
            strict: false,
            end: true,
          });
          const matches = locationRegexp.exec(extendedPath);
          if (!matches) {
            continue;
          }

          // Check if the body match the defined conditions.
          const bodyFields = Object.keys(pathConfig.bodyFields ?? {});
          const requestBodyKey = Object.keys(requestBody);
          if (pathConfig.restrictedBody) {
            const notAllowedFields = requestBodyKey.filter(
              (k) => !bodyFields.find((e) => e == k),
            );
            if (notAllowedFields.length > 0) {
              throw new BadRequestException(
                `Not allowed fields ${JSON.stringify(
                  notAllowedFields,
                )} provided.`,
              );
            }
          }
          const missingFields = bodyFields.filter(
            (field) =>
              (pathConfig.bodyFields ?? {})[field] === true &&
              !requestBodyKey.find((k) => k == field),
          );
          if (missingFields.length > 0) {
            throw new BadRequestException(
              `Mandatory fields ${JSON.stringify(
                missingFields,
              )} should be provided.`,
            );
          }

          // Retrieve a response.
          const getRequestedData = this.getRequestedData;
          const requestedData = await getRequestedData(
            extendedPath,
            configData,
            repoRootUrl1,
            repoRootUrl2,
          );
          if (!requestedData) {
            throw new NotFoundException('Response Mock not found');
          }

          // Basic schedule of notification if exist.
          const notificationConfig = pathConfig.scheduleNotification;
          if (
            notificationConfig &&
            requestBody[notificationConfig.followProp]
          ) {
            const endPoint = requestBody[
              notificationConfig.followProp
            ] as string;
            let url;
            try {
              url = new URL(endPoint);
            } catch (e) {
              throw new BadRequestException(
                `Invalid url '${endPoint}' provided`,
              );
            }
            setTimeout(async () => {
              axios.request({
                method: notificationConfig.notificationMethod ?? 'GET',
                url: url.toString(),
                timeout: 5000, // The request will abort after 5 sec.
                data: !notificationConfig.postDataPath
                  ? null
                  : await getRequestedData(
                      path.join(configData.apiRoutePrefix, notificationConfig.postDataPath),
                      configData,
                      repoRootUrl1,
                      repoRootUrl2,
                    ),
              });
            }, notificationConfig.timeoutInSecond * 1000);
          }
          return requestedData;
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

  private async getRequestedData(
    extendedPath: string,
    configData: MockApiConfig,
    repoRootUrl1: string,
    repoRootUrl2: string,
  ): Promise<Record<string, unknown> | null> {
    console.log(configData.apiRoutePrefix);
    const dbPath = normalizePath(
      path.join(
        configData.dbDataPath,
        normalizePath(extendedPath).substring(
          normalizePath(configData.apiRoutePrefix).length,
        ),
      ),
    );

    if (configData.dbFile == configFileName) {
      return getSubRecordFromRoot(
        dbPath,
        configData as unknown as Record<string, unknown>,
      );
    }

    const { errors: configErrors, rawData } = await getRawFile([
      {
        url: path.join(`${repoRootUrl1}`, `${configData.dbFile}`),
        urlConfig: {},
      },
      {
        url: path.join(`${repoRootUrl2}`, `${configData.dbFile}`),
        urlConfig: {
          headers: {
            Accept: 'application/vnd.github.raw',
          },
        },
      },
    ]);
    if (configErrors) {
      return null;
    }
    return getSubRecordFromRoot(dbPath, JSON.parse(rawData));
  }
}
