import { PartialType } from '@nestjs/swagger';
import { ContractTermsDto } from './create-contract.dto';

// CTR-06: sửa lỗi nhập từ hợp đồng giấy; người ở sửa ở OCC-04
export class UpdateContractDto extends PartialType(ContractTermsDto, { skipNullProperties: false }) {}
