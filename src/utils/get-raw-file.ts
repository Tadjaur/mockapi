import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Logger } from '@nestjs/common';

export async function getRawFile(
  params: {
    url: string;
    urlConfig: AxiosRequestConfig;
  }[],
): Promise<{ errors?: Record<string, unknown>[]; rawData: string }> {
  let count = 0;
  let errors = [];
  for (const { url, urlConfig } of params) {
    count++;
    try {
      const response = await axios.get(url, {...urlConfig, responseType: 'text'});

      return { rawData: response.data };
    } catch (err) {
      if (err instanceof AxiosError) {
        const error = {
          message: err.message,
          headers: err.config.headers,
          url: err.config.url,
          data: err.response.data,
        };
        Logger.error(`${count}> Failed to retrieve raw data from ${url}`, error);
        errors.push(error);
        continue;
      }
      throw err;
    }
  }

  return { errors, rawData: '' };
}
