import { z } from "zod"

export const MAX_ROOM_PRICE = 1_000_000_000
export const MAX_ROOM_AREA = 1_000
export const MAX_ROOM_FLOOR = 100

export const ROOM_VALIDATION_SUMMARY =
  "Vui lòng nhập đầy đủ thông tin phòng hợp lệ (tầng từ 0 đến 100, diện tích lớn hơn 0, giá niêm yết không âm)!"

const ROOM_CODE_REGEX = /^[A-Z0-9-]{1,20}$/

function parseStrictNumber(value: string): number {
  const trimmed = value.trim()
  if (trimmed === "") return Number.NaN
  return Number(trimmed)
}

export const roomFormSchema = z.object({
  code: z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => val.length > 0, {
      message: "Mã phòng không được để trống",
    })
    .refine((val) => ROOM_CODE_REGEX.test(val), {
      message: "Mã phòng gồm 1 đến 20 ký tự: chữ không dấu, số, gạch ngang",
    }),
  floor: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: "Tầng không được để trống",
    })
    .refine(
      (val) => {
        const n = parseStrictNumber(val)
        return Number.isInteger(n) && n >= 0 && n <= MAX_ROOM_FLOOR
      },
      {
        message: "Tầng phải là số nguyên từ 0 đến 100",
      },
    ),
  areaM2: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: "Diện tích không được để trống",
    })
    .refine(
      (val) => {
        const n = parseStrictNumber(val)
        if (!Number.isFinite(n) || n <= 0 || n > MAX_ROOM_AREA) return false
        const decimals = val.trim().split(".")[1]
        return !decimals || decimals.length <= 2
      },
      {
        message: "Diện tích phải lớn hơn 0, tối đa 1.000 m² (tối đa 2 chữ số thập phân)",
      },
    ),
  listedPrice: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: "Giá niêm yết không được để trống",
    })
    .refine(
      (val) => {
        const n = parseStrictNumber(val)
        return Number.isInteger(n) && n >= 0 && n <= MAX_ROOM_PRICE
      },
      {
        message: "Giá niêm yết phải là số nguyên từ 0 đến 1.000.000.000 đồng",
      },
    ),
  note: z
    .string()
    .max(500, "Ghi chú tối đa 500 ký tự")
    .optional(),
  isUnderMaintenance: z.boolean(),
})

export type RoomFormInput = z.input<typeof roomFormSchema>
export type RoomFormValues = z.output<typeof roomFormSchema>
