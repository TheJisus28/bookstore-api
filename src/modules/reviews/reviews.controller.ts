import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewDto, CreateReviewDto, UpdateReviewDto } from './review.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('book/:bookId')
  @ApiOperation({ summary: 'Get reviews for a book (paginated)' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reviews',
    type: PaginatedResponseDto<ReviewDto>,
  })
  findByBook(
    @Param('bookId') bookId: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<ReviewDto>> {
    return this.reviewsService.findByBook(bookId, pagination);
  }

  @Get('can-review/:bookId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can review a book (has purchased it)' })
  @ApiParam({ name: 'bookId', description: 'Book UUID' })
  @ApiResponse({
    status: 200,
    description: 'Whether user can review the book',
  })
  canReview(@Request() req, @Param('bookId') bookId: string): Promise<{ canReview: boolean; hasReviewed: boolean }> {
    return this.reviewsService.canReview(req.user.id, bookId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review details', type: ReviewDto })
  findOne(@Param('id') id: string): Promise<ReviewDto | null> {
    return this.reviewsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (customer only)' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewDto,
  })
  create(@Request() req, @Body() createReviewDto: CreateReviewDto): Promise<ReviewDto> {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review (customer - own reviews only)' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review updated', type: ReviewDto })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviewsService.update(req.user.id, id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (customer - own reviews only)' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.reviewsService.remove(req.user.id, id);
  }
}
