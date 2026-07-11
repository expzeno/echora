import { z } from 'zod';

export const createMerchantSchema = z.object({
  email: z.string().email().max(255),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
});

export const updateMerchantSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' });
