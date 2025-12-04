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
import { AuthorsService } from './authors.service';
import { AuthorDto, CreateAuthorDto, UpdateAuthorDto } from './author.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all authors (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of authors',
    type: PaginatedResponseDto<AuthorDto>,
  })
  findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<AuthorDto>> {
    return this.authorsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an author by ID' })
  @ApiParam({ name: 'id', description: 'Author UUID' })
  @ApiResponse({ status: 200, description: 'Author details', type: AuthorDto })
  findOne(@Param('id') id: string): Promise<AuthorDto | null> {
    return this.authorsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new author (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Author created successfully',
    type: AuthorDto,
  })
  create(@Body() createAuthorDto: CreateAuthorDto): Promise<AuthorDto> {
    return this.authorsService.create(createAuthorDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an author (admin only)' })
  @ApiParam({ name: 'id', description: 'Author UUID' })
  @ApiResponse({ status: 200, description: 'Author updated', type: AuthorDto })
  update(
    @Param('id') id: string,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ): Promise<AuthorDto> {
    return this.authorsService.update(id, updateAuthorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an author (admin only)' })
  @ApiParam({ name: 'id', description: 'Author UUID' })
  @ApiResponse({ status: 200, description: 'Author deleted' })
  remove(@Param('id') id: string): Promise<void> {
    return this.authorsService.remove(id);
  }
}

