import { Controller, Request, Delete, HttpCode } from '@nestjs/common';
import { AccountService } from './account.service';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';
import { constants } from 'http2';

@ApiTags('account')
@ApiBearerAuth('access-token')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ApiNoContentResponse({
    description: 'Delete account.',
  })
  @Delete()
  @HttpCode(constants.HTTP_STATUS_NO_CONTENT)
  async delete(@Request() req: RequestWithUser): Promise<void> {
    await this.accountService.delete(req.user.sub, req.authToken);
  }
}
