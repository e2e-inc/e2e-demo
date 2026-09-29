// Free stock portraits from Unsplash. Demo profiles use photography while
// real profiles continue to fall back to their chosen color and initials.
const UNSPLASH_PARAMS = 'auto=format&fit=crop&crop=faces&w=240&h=240&q=82';

const PROFILE_PHOTOS: Record<string, string> = {
  'Ava Chen': `https://images.unsplash.com/photo-1494790108377-be9c29b29330?${UNSPLASH_PARAMS}`,
  'Marcus Reed': `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?${UNSPLASH_PARAMS}`,
  'Priya Patel': `https://images.unsplash.com/photo-1531123897727-8f129e1688ce?${UNSPLASH_PARAMS}`,
  'Leo Alvarez': `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?${UNSPLASH_PARAMS}`,
  'Nia Okafor': `https://images.unsplash.com/photo-1534528741775-53994a69daeb?${UNSPLASH_PARAMS}`,
  'Sam Torres': `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?${UNSPLASH_PARAMS}`,
  'Jules Kim': `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?${UNSPLASH_PARAMS}`,
  'Hana Sato': `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?${UNSPLASH_PARAMS}`,
  'Theo Brooks': `https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?${UNSPLASH_PARAMS}`,
  'Zoe Martin': `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?${UNSPLASH_PARAMS}`,
};

export function profilePhotoFor(displayName: string | undefined) {
  return displayName ? PROFILE_PHOTOS[displayName] : undefined;
}
