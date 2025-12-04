import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
import { AddressesService } from './addresses.service';
import {
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get my addresses' })
  @ApiResponse({
    status: 200,
    description: 'List of my addresses',
    type: [AddressDto],
  })
  findByUser(@Request() req): Promise<AddressDto[]> {
    return this.addressesService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an address by ID' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @ApiResponse({ status: 200, description: 'Address details', type: AddressDto })
  findOne(@Request() req, @Param('id') id: string): Promise<AddressDto | null> {
    return this.addressesService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    type: AddressDto,
  })
  create(@Request() req, @Body() createAddressDto: CreateAddressDto): Promise<AddressDto> {
    return this.addressesService.create(req.user.id, createAddressDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @ApiResponse({ status: 200, description: 'Address updated', type: AddressDto })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    return this.addressesService.update(req.user.id, id, updateAddressDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.addressesService.remove(req.user.id, id);
  }
}

