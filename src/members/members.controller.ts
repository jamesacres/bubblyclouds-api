import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { Permission } from '@/types/enums/permission.enum';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/decorators/require-permissions.decorator';
import { MemberDto } from './dto/member.dto';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';

@RequirePermissions(Permission.MEMBERS_WRITE)
@ApiTags('members')
@ApiBearerAuth('access-token')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @ApiCreatedResponse({
    description: 'Member has now joined the resource.',
    type: MemberDto,
  })
  @Post()
  create(
    @Request() req: RequestWithUser,
    @Body() createMemberDto: CreateMemberDto,
  ): Promise<MemberDto> {
    const createdBy = req.user.sub;
    return this.membersService.create(createMemberDto, createdBy);
  }

  @ApiOkResponse({
    description: 'Members of the resource.',
    type: [MemberDto],
  })
  @Get()
  @ApiQuery({ name: 'resourceId', type: 'string', required: true })
  findAll(
    @Request() req: RequestWithUser,
    @Query('resourceId') resourceId: string,
  ): Promise<MemberDto[]> {
    if (!resourceId) {
      throw new BadRequestException('resourceId required');
    }
    const requestedBy = req.user.sub;
    return this.membersService.findAll(resourceId, requestedBy);
  }
}
