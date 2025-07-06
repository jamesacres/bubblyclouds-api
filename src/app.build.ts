import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './exceptionFilters/all-exceptions.filter';
import { ExpressAdapter } from '@nestjs/platform-express';
import { fetchPublicKey } from './utils/fetchPublicKey';
import { DatePipe } from './pipes/datePipe';
import { fetchAppConfig } from './utils/fetchAppConfig';

export async function build(express: any) {
  // Speed up cold starts by fetching our public key and app config now without blocking
  void fetchPublicKey().catch((e) => console.error(e));
  void fetchAppConfig().catch((e) => console.error(e));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(express));
  const { httpAdapter } = app.get(HttpAdapterHost);

  app.use(helmet());
  app.enableCors();

  app.useGlobalPipes(new DatePipe());

  app.useGlobalPipes(
    new ValidationPipe({
      enableDebugMessages: true,
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('Bubbly Clouds API')
    .setDescription('An API to power Bubbly Clouds projects')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: `Please enter token in following format: Bearer <JWT>`,
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  return app;
}
