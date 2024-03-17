import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
  create(@Body() createMemberDto: CreateMemberDto): Promise<MemberDto> {
    return this.membersService.create(createMemberDto);
  }

  @ApiOkResponse({
    description: 'Members of the resource.',
    type: [MemberDto],
  })
  @Get()
  @ApiQuery({ name: 'resourceId', type: 'string', required: true })
  findAll(@Query('resourceId') resourceId: string): Promise<MemberDto[]> {
    return this.membersService.findAll(resourceId);
  }
}
