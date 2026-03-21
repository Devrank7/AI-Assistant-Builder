import connectDB from './mongodb';
import Brand from '@/models/Brand';
import { randomUUID } from 'crypto';

export interface CreateBrandData {
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  domain?: string;
  tagline?: string;
  description?: string;
  socialLinks?: { platform: string; url: string }[];
  widgetIds?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

export async function createBrand(orgId: string, userId: string, data: CreateBrandData) {
  await connectDB();

  // If this will be default, unset all others in org first
  if (data.isDefault) {
    await Brand.updateMany({ organizationId: orgId }, { $set: { isDefault: false } });
  }

  const brandId = randomUUID();
  return Brand.create({ brandId, organizationId: orgId, userId, ...data });
}

export async function getBrands(orgId: string) {
  await connectDB();
  return Brand.find({ organizationId: orgId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

export async function getBrandById(id: string, orgId: string) {
  await connectDB();
  return Brand.findOne({ _id: id, organizationId: orgId }).lean();
}

export async function updateBrand(id: string, orgId: string, data: Record<string, unknown>) {
  await connectDB();

  // If setting as default, unset others first
  if (data.isDefault) {
    await Brand.updateMany({ organizationId: orgId, _id: { $ne: id } }, { $set: { isDefault: false } });
  }

  return Brand.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: data }, { new: true }).lean();
}

export async function deleteBrand(id: string, orgId: string) {
  await connectDB();
  return Brand.findOneAndDelete({ _id: id, organizationId: orgId });
}

export async function applyBrandToWidgets(id: string, orgId: string, widgetIds: string[]) {
  await connectDB();

  const brand = await Brand.findOne({ _id: id, organizationId: orgId });
  if (!brand) return null;

  // Update brand's widgetIds list
  brand.widgetIds = widgetIds;
  await brand.save();

  return brand;
}

export async function assignWidgetToBrand(brandId: string, widgetId: string) {
  await connectDB();
  return Brand.findByIdAndUpdate(brandId, { $addToSet: { widgetIds: widgetId } }, { new: true });
}

export async function getBrandByDomain(domain: string) {
  await connectDB();
  return Brand.findOne({ domain });
}
