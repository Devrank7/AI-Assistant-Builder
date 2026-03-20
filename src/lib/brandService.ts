import connectDB from './mongodb';
import Brand from '@/models/Brand';

export async function createBrand(
  orgId: string,
  data: {
    name: string;
    slug: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    domain?: string;
    description?: string;
    isDefault?: boolean;
  }
) {
  await connectDB();
  return Brand.create({ organizationId: orgId, ...data });
}

export async function getBrands(orgId: string) {
  await connectDB();
  return Brand.find({ organizationId: orgId }).sort({ isDefault: -1, createdAt: -1 });
}

export async function getBrandById(brandId: string) {
  await connectDB();
  return Brand.findById(brandId);
}

export async function updateBrand(brandId: string, orgId: string, data: Record<string, unknown>) {
  await connectDB();
  return Brand.findOneAndUpdate({ _id: brandId, organizationId: orgId }, { $set: data }, { new: true });
}

export async function deleteBrand(brandId: string, orgId: string) {
  await connectDB();
  return Brand.findOneAndDelete({ _id: brandId, organizationId: orgId });
}

export async function assignWidgetToBrand(brandId: string, widgetId: string) {
  await connectDB();
  return Brand.findByIdAndUpdate(brandId, { $addToSet: { widgetIds: widgetId } }, { new: true });
}

export async function getBrandByDomain(domain: string) {
  await connectDB();
  return Brand.findOne({ domain });
}
