import SectionWithFeed from '@/components/sections/SectionWithFeed';

// Notes are mirrored in from the w_notes app and change whenever a note is
// edited, so this page must never be statically cached.
export const revalidate = 0;

export default function NotesPage() {
  return (
    <SectionWithFeed
      title="Notes"
      directory="notes"
      category="notes"
      categorySlug="notes"
      useDatabase={true}
    />
  );
}
