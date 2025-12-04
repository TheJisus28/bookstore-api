import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PublishersService } from './publishers.service';
import {
  PublisherDto,
  CreatePublisherDto,
  UpdatePublisherDto,
} from './publisher.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all publishers (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of publishers',
    type: PaginatedResponseDto<PublisherDto>,
  })
  findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<PublisherDto>> {
    return this.publishersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publisher by ID' })
  @ApiParam({ name: 'id', description: 'Publisher UUID' })
  @ApiResponse({ status: 200, description: 'Publisher details', type: PublisherDto })
  findOne(@Param('id') id: string): Promise<PublisherDto | null> {
    return this.publishersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new publisher (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Publisher created successfully',
    type: PublisherDto,
  })
  create(
    @Body() createPublisherDto: CreatePublisherDto,
  ): Promise<PublisherDto> {
    return this.publishersService.create(createPublisherDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a publisher (admin only)' })
  @ApiParam({ name: 'id', description: 'Publisher UUID' })
  @ApiResponse({ status: 200, description: 'Publisher updated', type: PublisherDto })
  update(
    @Param('id') id: string,
    @Body() updatePublisherDto: UpdatePublisherDto,
  ): Promise<PublisherDto> {
    return this.publishersService.update(id, updatePublisherDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a publisher (admin only)' })
  @ApiParam({ name: 'id', description: 'Publisher UUID' })
  @ApiResponse({ status: 200, description: 'Publisher deleted' })
  remove(@Param('id') id: string): Promise<void> {
    return this.publishersService.remove(id);
  }
}
