import { Inject, Injectable, ValidationError } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { ValidityCheck } from 'src/validators/validity.check';
import * as path from 'path';

export enum NotificationMethod {
  post = 'POST',
  get = 'GET',
}

const maximumNotificationDelayInSecond = 5 * 60;
const defaultNotificationMethod = NotificationMethod.get;
const configVersion = '0.0.1';
const allowedDbFileExt = new Set(['.yml', '.yaml', '.json']);

class PostNotification {
  /** The body property of the post request body which could contain the notification url */
  @IsNotEmpty()
  @IsString()
  followProp: string;

  /** The delay before the notification will be send to the provided end point */
  @Max(maximumNotificationDelayInSecond)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })
  @IsOptional()
  timeoutInSecond: number;

  /**
   * The method to use to notify the end point provided in the value of ${followProp}
   * When value is set to 'post', you also need to provide the 'postDataPath' property.
   * Default to: GET.
   *
   */
  @IsEnum(NotificationMethod)
  @IsOptional()
  notificationMethod: NotificationMethod;

  /**
   * The db path of the notification data
   */
  @ValidityCheck((val, name, parentName, obj) => {
    const notificationMethod =
      obj['notificationMethod'] ?? defaultNotificationMethod;
    if (notificationMethod == NotificationMethod.get) {
      return { isValid: true };
    }
    if (`${val}`.length == 0 || !path.isAbsolute(`${val}`)) {
      return {
        isValid: false,
        message: `Invalid value for field ${parentName}.${name}. Absolute db path is required.`,
      };
    }
    return { isValid: true };
  })
  postDataPath: string;
}
export class PostApi {
  /** The path regex to this route. */
  @IsNotEmpty()
  @IsString()
  path: string;

  @ValidateNested()
  @IsNotEmptyObject()
  @IsObject()
  @IsOptional()
  @Type(() => PostNotification)
  scheduleNotification?: PostNotification;

  /**
   * A record of defined body field of the received request
   * which keys represent the name of the defined field and value the mandatory check of
   * that property.
   */
  @ValidityCheck((val, propertyName, parentClassName, obj) => {
    for (const [key, value] of Object.entries(val)) {
      if (typeof key == 'string' && typeof value == 'boolean') {
        continue;
      }
      return {
        isValid: false,
        message: `Invalid '${propertyName}' property from ${parentClassName}. <${key}> should be a string and <${value}> have to be a boolean`,
      };
    }
    return { isValid: true };
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }) => Object(value))
  bodyFields?: Record<string, boolean>;

  /**
   * Restrict body to the defined body field.
   * And return bad request (status code: 400) when we seen any other properties.
   */
  @IsBoolean()
  @IsOptional()
  restrictedBody: boolean;
}

class RouteConfig {
  @ValidateNested()
  @ArrayUnique()
  @IsArray()
  @IsOptional()
  @Type(() => PostApi)
  post?: PostApi[];

  @ArrayUnique()
  @IsArray()
  @IsOptional()
  get?: string[];
}

/**
 * The mock api class representation.
 */
class MockApiConfig {
  /** The version of the api. Useful if we have a breaking update */
  @ValidityCheck((prop) => {
    const versionSegments = `${prop}`.split('.');
    if (versionSegments.length != 3) {
      return {
        message: `Invalid version provided: ${prop}. Required format: *.*.*`,
        isValid: false,
      };
    }
    const configVersionSegment = configVersion.split('.');
    for (let index = 0; index < versionSegments.length; index++) {
      const version = versionSegments[index];
      if (isNaN(Number(version))) {
        return {
          message: `Invalid number found '${version}' on provided version: ${prop}`,
          isValid: false,
        };
      }
      if (version > configVersionSegment[index]) {
        return {
          message: `Unsupported config version '${prop}' provided. The max supported is ${configVersion}`,
          isValid: false,
        };
      }
    }
    return { isValid: true };
  })
  @IsString()
  version: string;

  /** The database file to use. In order to have several compatibility we support both yml and json file. */
  @ValidityCheck((prop) => {
    const extension = path.extname(`${prop}`);
    if (!allowedDbFileExt.has(extension)) {
      return {
        isValid: false,
        message: `Invalid db extension '${extension}' provided.`,
      };
    }
    return { isValid: true };
  })
  @IsString()
  @IsOptional()
  dbFile?: string;

  @ValidityCheck((prop) => {
    if (!path.isAbsolute(`${prop}`)) {
      return {
        isValid: false,
        message: `Invalid db data path ${prop}. absolute path is required.`,
      };
    }
    return { isValid: true };
  })
  @IsString()
  @IsOptional()
  dbDataPath?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiRoutePrefix: string;

  @ValidateNested()
  @IsNotEmptyObject()
  @IsObject()
  @IsOptional()
  @Type(() => RouteConfig)
  routes: RouteConfig;
}

const defaultConfigValue: MockApiConfig = {
  version: '0.0.1',
  dbFile: 'db.json',
  dbDataPath: '/',
  apiRoutePrefix: '/api',
  routes: {
    get: ['*'],
  },
};

Injectable();
export class ApiConfig {
  static loadConfig(fileContain: string): {
    data: MockApiConfig;
    errors: ValidationError[];
  } {
    const configRaw = yaml.load(fileContain) as Record<string, unknown>;
    const validatedConfig = plainToInstance(MockApiConfig, configRaw, {
      enableImplicitConversion: true,
    });
    const errors = validateSync(validatedConfig, {
      skipMissingProperties: false,
      forbidUnknownValues: true,
    });

    const defaultInstance = plainToInstance(MockApiConfig, defaultConfigValue, {
      enableImplicitConversion: true,
    });
    return {
      data: {
        ...defaultInstance,
        routes: {
          post: validatedConfig.routes.post ?? defaultInstance.routes.post,
          get: validatedConfig.routes.get ?? defaultInstance.routes.get,
        },
        ...validatedConfig,
      },
      errors,
    };
  }
}
