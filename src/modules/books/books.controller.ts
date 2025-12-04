import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import {
  BookDto,
  BookSearchResultDto,
  CreateBookDto,
  UpdateBookDto,
} from './book.dto';
import { BookAuthorDto, AddAuthorToBookDto, BookWithAuthorsDto } from './book-authors.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { BookSearchFiltersDto } from './book-search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all books (customers - active only)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of books',
    type: PaginatedResponseDto<BookDto>,
  })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ): Promise<PaginatedResponseDto<BookDto | BookSearchResultDto>> {
    if (search) {
      return this.booksService.search(search, pagination);
    }
    return this.booksService.findAll(pagination, false);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all books including inactive (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all books',
    type: PaginatedResponseDto<BookDto>,
  })
  findAllAdmin(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<BookDto>> {
    return this.booksService.findAll(pagination, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a book by ID' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book details', type: BookDto })
  @ApiResponse({ status: 404, description: 'Book not found' })
  findOne(@Param('id') id: string): Promise<BookDto | null> {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new book (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Book created successfully',
    type: BookDto,
  })
  create(@Body() createBookDto: CreateBookDto): Promise<BookDto> {
    return this.booksService.create(createBookDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a book (admin only)' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book updated', type: BookDto })
  @ApiResponse({ status: 404, description: 'Book not found' })
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<BookDto> {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a book (admin only)' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book deleted' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.booksService.remove(id);
  }

  @Get('search/advanced')
  @ApiOperation({ summary: 'Advanced book search with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'author', required: false })
  @ApiQuery({ name: 'publisher', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'minStock', required: false, type: Number })
  @ApiQuery({ name: 'maxStock', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'price', 'date', 'rating'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: PaginatedResponseDto<BookSearchResultDto>,
  })
  advancedSearch(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('author') author?: string,
    @Query('publisher') publisher?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('language') language?: string,
    @Query('minStock') minStock?: string,
    @Query('maxStock') maxStock?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedResponseDto<BookSearchResultDto>> {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    return this.booksService.advancedSearch(
      search || null,
      category || null,
      author || null,
      publisher || null,
      minPrice ? parseFloat(minPrice) : null,
      maxPrice ? parseFloat(maxPrice) : null,
      minRating ? parseFloat(minRating) : null,
      language || null,
      minStock ? parseInt(minStock, 10) : null,
      maxStock ? parseInt(maxStock, 10) : null,
      startDate || null,
      endDate || null,
      sortBy || null,
      sortOrder || null,
      pagination,
    );
  }

  @Get('bestsellers')
  @ApiOperation({ summary: 'Get bestsellers' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'List of bestsellers' })
  getBestsellers(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any[]> {
    return this.booksService.getBestsellers(limit, startDate, endDate);
  }

  @Get(':id/authors')
  @ApiOperation({ summary: 'Get authors for a book' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of authors for the book',
    type: [BookWithAuthorsDto],
  })
  getBookAuthors(@Param('id') id: string): Promise<BookWithAuthorsDto[]> {
    return this.booksService.getBookAuthors(id);
  }

  @Post(':id/authors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add author to book (admin only)' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({
    status: 201,
    description: 'Author added to book',
    type: BookAuthorDto,
  })
  addAuthorToBook(
    @Param('id') id: string,
    @Body() addAuthorToBookDto: AddAuthorToBookDto,
  ): Promise<BookAuthorDto> {
    return this.booksService.addAuthorToBook(id, addAuthorToBookDto);
  }

  @Delete(':id/authors/:authorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove author from book (admin only)' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiParam({ name: 'authorId', description: 'Author UUID' })
  @ApiResponse({ status: 200, description: 'Author removed from book' })
  removeAuthorFromBook(
    @Param('id') id: string,
    @Param('authorId') authorId: string,
  ): Promise<void> {
    return this.booksService.removeAuthorFromBook(id, authorId);
  }
}
