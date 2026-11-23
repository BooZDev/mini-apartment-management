import 'reflect-metadata';
import { AppException } from '../../exceptions/app.exception';
import { CreateContractDto } from 'src/contracts/dto/create-contract.dto';
import { CreateChargeTypeDto } from 'src/charge-types/dto/create-charge-type.dto';
import { createValidationPipe } from '../validation.pipe';

const pipe = createValidationPipe();

async function errorOf(metatype: new () => object, value: unknown) {
  try {
    await pipe.transform(value, { type: 'body', metatype });
  } catch (e) {
    return (e as AppException).getResponse() as {
      code: string;
      message: string;
      details: { field: string; code: string }[];
    };
  }
  throw new Error('không có lỗi');
}

describe('ValidationPipe', () => {
  it('tên trường lồng nhau dạng primaryTenant.idNumber, items[0].x; thiếu trường chỉ báo REQUIRED', async () => {
    const body = await errorOf(CreateContractDto, {
      roomId: 'x',
      signedOn: '2026-10-01',
      startDate: '2026-11-01',
      endDate: '2026-10-01',
      monthlyRent: 1,
      deposit: 0,
      tenantUsername: 'abc',
      primaryTenant: { fullName: 'A', dateOfBirth: '1990-01-01', hometown: 'B' },
      additionalOccupants: [{ fullName: 'C', dateOfBirth: '1990-01-01', hometown: 'D', idNumber: '1' }],
    });
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'primaryTenant.idNumber', code: 'REQUIRED' }),
        expect.objectContaining({ field: 'additionalOccupants[0].idNumber', code: 'INVALID_FORMAT' }),
        expect.objectContaining({ field: 'additionalOccupants[0].relationshipToPrimary', code: 'REQUIRED' }),
        expect.objectContaining({ field: 'endDate', code: 'END_BEFORE_START' }),
      ]),
    );
    expect(body.details.filter((d) => d.field === 'primaryTenant.idNumber')).toHaveLength(1);
  });

  it('trường lạ bị từ chối, chuỗi số không bị ép thành số', async () => {
    const body = await errorOf(CreateChargeTypeDto, {
      name: 'Wifi',
      calculationMethod: 'PER_ROOM',
      initialPrice: { unitPrice: '100000', effectiveFrom: '2026-11-01' },
      isAdmin: true,
    });
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'isAdmin' }),
        expect.objectContaining({ field: 'initialPrice.unitPrice' }),
      ]),
    );
    expect(body.message).toBe('Hãy nhập vào số tiền hợp lệ!');
  });
});
