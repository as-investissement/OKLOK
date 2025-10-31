import { supabase } from './supabaseClient';

const BUCKET_NAME = 'company-logos';

export async function ensureStorageBucket() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }

      console.log('✅ Storage bucket created:', BUCKET_NAME);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring storage bucket:', error);
    return false;
  }
}

export async function uploadCompanyLogo(file: File, companyName: string): Promise<string | null> {
  try {
    await ensureStorageBucket();

    const sanitizedName = companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `logo-${sanitizedName}-${Date.now()}.${extension}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading logo:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('✅ Logo uploaded:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadCompanyLogo:', error);
    return null;
  }
}

export async function deleteCompanyLogo(logoUrl: string): Promise<boolean> {
  try {
    const fileName = logoUrl.split('/').pop();
    if (!fileName) return false;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting logo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCompanyLogo:', error);
    return false;
  }
}
