import { z } from 'zod';

/**
 * カスタムルールのZodスキーマ
 * 
 * このスキーマは、カスタムAIルールの出力を検証するために使用されます。
 * design-ai-linterがAIからのレスポンスをこのスキーマで検証します。
 */
export const schema = z.object({
  issues: z.array(
    z.object({
      problem: z.string().describe('検出された問題の説明'),
      reason: z.string().describe('問題が発生している理由'),
      tokenName: z.string().nullable().optional().describe('関連するトークン名（該当する場合）'),
      suggestion: z.string().nullable().optional().describe('改善提案'),
      impact: z
        .enum(['Low', 'Medium', 'High'])
        .nullable()
        .optional()
        .describe('問題の影響度'),
    })
  ),
});

export default schema;

