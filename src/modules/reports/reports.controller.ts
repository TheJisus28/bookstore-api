import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Generate sales report (admin only)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'author', required: false, type: String })
  @ApiQuery({ name: 'publisher', required: false, type: String })
  @ApiQuery({ name: 'book', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sales report' })
  generateSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('category') category?: string,
    @Query('author') author?: string,
    @Query('publisher') publisher?: string,
    @Query('book') book?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('status') status?: string,
  ): Promise<any[]> {
    return this.reportsService.generateSalesReport(
      startDate,
      endDate,
      category || undefined,
      author || undefined,
      publisher || undefined,
      book || undefined,
      minPrice ? parseFloat(minPrice) : undefined,
      maxPrice ? parseFloat(maxPrice) : undefined,
      status || undefined,
    );
  }

  @Get('book-catalog')
  @ApiOperation({ summary: 'Get book catalog view (admin only)' })
  @ApiResponse({ status: 200, description: 'Book catalog' })
  getBookCatalog(): Promise<any[]> {
    return this.reportsService.getBookCatalog();
  }

  @Get('order-summary')
  @ApiOperation({ summary: 'Get order summary view (admin only)' })
  @ApiResponse({ status: 200, description: 'Order summary' })
  getOrderSummary(): Promise<any[]> {
    return this.reportsService.getOrderSummary();
  }

  @Get('customer-history')
  @ApiOperation({ summary: 'Get customer purchase history view (admin only)' })
  @ApiResponse({ status: 200, description: 'Customer purchase history' })
  getCustomerPurchaseHistory(): Promise<any[]> {
    return this.reportsService.getCustomerPurchaseHistory();
  }

  @Get('sold-books')
  @ApiOperation({ summary: 'Get sold books report (admin only)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'author', required: false, type: String })
  @ApiQuery({ name: 'publisher', required: false, type: String })
  @ApiQuery({ name: 'book', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sold books report' })
  getSoldBooks(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('category') category?: string,
    @Query('author') author?: string,
    @Query('publisher') publisher?: string,
    @Query('book') book?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('status') status?: string,
  ): Promise<any[]> {
    return this.reportsService.getSoldBooks(
      startDate,
      endDate,
      category || undefined,
      author || undefined,
      publisher || undefined,
      book || undefined,
      minPrice ? parseFloat(minPrice) : undefined,
      maxPrice ? parseFloat(maxPrice) : undefined,
      status || undefined,
    );
  }
}

