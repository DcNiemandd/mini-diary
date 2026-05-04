import { z } from 'zod';

const EXPORT_VERSION = 1;

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const rawEntrySchema = z.object({
    date: isoDateString,
    content: z.string(),
    inRow: z.number().int().nonnegative(),
});

const encryptedEntrySchema = z.object({
    encryptedDate: z.string().min(1),
    encryptedContent: z.string(),
    inRow: z.string().min(1),
});

const encryptedUserSchema = z.object({
    encryptedUserKey: z.string().min(1),
    salt: z.string().min(1),
    hmac: z.string().min(1),
});

const baseExportSchema = z.object({
    version: z.literal(EXPORT_VERSION),
    exportedAt: z.string().datetime(),
});

export const rawExportSchema = baseExportSchema.extend({
    entries: z.array(rawEntrySchema),
});

export const encryptedExportSchema = baseExportSchema.extend({
    user: encryptedUserSchema,
    entries: z.array(encryptedEntrySchema),
});

export const exportSchema = z.union([encryptedExportSchema, rawExportSchema]);

export type RawExport = z.infer<typeof rawExportSchema>;
export type EncryptedExport = z.infer<typeof encryptedExportSchema>;
export type DiaryExport = z.infer<typeof exportSchema>;

export const isEncryptedExport = (e: DiaryExport): e is EncryptedExport => 'user' in e;
