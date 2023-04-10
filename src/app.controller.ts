import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':gitUser/:gitRepository')
  getRepoPage(): string {
    return this.appService.getHello();
  }
  
  @Get(':gitUser/:gitRepository')
  getRepoConfig(): string {
    return this.appService.getHello();
  }
}
