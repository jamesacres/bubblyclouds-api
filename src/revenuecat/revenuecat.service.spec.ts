import { Test, TestingModule } from '@nestjs/testing';
import { RevenuecatService } from './revenuecat.service';

describe('RevenuecatService', () => {
  let service: RevenuecatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevenuecatService],
    }).compile();

    service = module.get<RevenuecatService>(RevenuecatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
