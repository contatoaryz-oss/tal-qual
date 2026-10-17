// Tipos espelham replica/schema.sql (snake_case → camelCase). Quando o Supabase entrar,
// estes tipos saem do `supabase gen types` e as telas não mudam.

export type Id = string;
export type ISODate = string;

export type WorkspaceStatus = 'onboarding' | 'ready' | 'archived';
export type BusinessType = 'service' | 'ecommerce' | 'local' | 'agency' | 'software' | 'creator' | 'generic';

export interface Workspace {
  id: Id;
  orgId: Id;
  name: string;
  slug: string;
  websiteUrl: string | null;
  instagramHandle: string | null;
  businessType: BusinessType | null;
  niche: string | null;
  country: string;
  language: string;
  timezone: string;
  status: WorkspaceStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const STAGES = ['scrape', 'brand_kit', 'niche', 'offers', 'icps', 'knowledge', 'archetype'] as const;
export type StageKey = (typeof STAGES)[number];
export type StageStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface OnboardingStage {
  workspaceId: Id;
  stage: StageKey;
  status: StageStatus;
  message: string | null;
  startedAt: ISODate | null;
  finishedAt: ISODate | null;
}

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'bg' | 'text';
export interface BrandColor { hex: string; role: ColorRole }
export interface BrandFont { family: string; role: 'heading' | 'body' }

export const BRAND_FIELDS = ['companyName', 'headline', 'toneOfVoice', 'targetAudience', 'colors', 'fonts'] as const;
export type BrandField = (typeof BRAND_FIELDS)[number];

export interface BrandKit {
  workspaceId: Id;
  companyName: string | null;
  headline: string | null;
  logoPath: string | null;
  colors: BrandColor[];
  fonts: BrandFont[];
  toneOfVoice: string | null;
  targetAudience: string | null;
  proofPoints: string[];
  editedFields: BrandField[];
  updatedAt: ISODate;
}

export interface Icp {
  id: Id;
  workspaceId: Id;
  name: string;
  title: string | null;
  description: string | null;
  demographics: { age?: string; gender?: string; income?: string; location?: string; education?: string };
  painPoints: string[];
  goals: string[];
  objections: string[];
  channels: string[];
  customerWords: string[];
  origin: 'generated' | 'manual';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type OfferKind = 'service' | 'product' | 'promotion' | 'lead_magnet' | 'package';
export interface Offer {
  id: Id;
  workspaceId: Id;
  title: string;
  description: string | null;
  kind: OfferKind;
  priceCents: number | null;
  currency: string;
  status: 'draft' | 'active' | 'archived';
  origin: 'generated' | 'manual' | 'scraped';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface OfferIcp { offerId: Id; icpId: Id; workspaceId: Id; isPrimary: boolean }

export type CreativeFormat = 'image' | 'carousel' | 'photo_ad' | 'ad_copy' | 'caption';
export type Placement = 'instagram_portrait' | 'instagram_story' | 'instagram_square' | 'facebook_feed' | 'linkedin' | 'tiktok_story';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:2';
export type CreativeStyle = 'hero' | 'lifestyle' | 'ugc' | 'hyperrealistic' | 'founder' | 'infographic' | 'typographic';
export type CreativeStatus = 'draft' | 'queued' | 'processing' | 'succeeded' | 'failed';

export interface Creative {
  id: Id;
  workspaceId: Id;
  format: CreativeFormat;
  placement: Placement;
  aspectRatio: AspectRatio;
  style: CreativeStyle | null;
  brief: string;
  offerId: Id | null;
  icpId: Id | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  status: CreativeStatus;
  error: string | null;
  favorite: boolean;
  batchId: Id;
  currentVersion: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreativeVersion {
  id: Id;
  creativeId: Id;
  workspaceId: Id;
  version: number;
  mediaPaths: string[];
  headline: string | null;
  body: string | null;
  cta: string | null;
  editInstruction: string | null;
  generator: string;
  costCents: number;
  createdAt: ISODate;
}

export interface ApiCost {
  id: Id;
  orgId: Id;
  workspaceId: Id | null;
  provider: 'anthropic' | 'image' | 'apify' | 'windsor' | 'embeddings';
  operation: string;
  costCents: number;
  idempotencyKey: string;
  createdAt: ISODate;
}

export interface Org { id: Id; name: string; monthlyCostCapCents: number; currency: string }

export const PLACEMENTS: Record<Placement, { label: string; ratio: AspectRatio; w: number; h: number }> = {
  instagram_portrait: { label: 'Feed do Instagram (4:5)', ratio: '4:5', w: 1080, h: 1350 },
  instagram_story: { label: 'Stories e Reels (9:16)', ratio: '9:16', w: 1080, h: 1920 },
  instagram_square: { label: 'Quadrado (1:1)', ratio: '1:1', w: 1080, h: 1080 },
  facebook_feed: { label: 'Feed do Facebook (1:1)', ratio: '1:1', w: 1080, h: 1080 },
  linkedin: { label: 'LinkedIn (1:1)', ratio: '1:1', w: 1080, h: 1080 },
  tiktok_story: { label: 'TikTok (9:16)', ratio: '9:16', w: 1080, h: 1920 },
};
