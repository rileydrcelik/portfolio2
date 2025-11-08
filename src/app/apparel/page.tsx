import Feed from '@/components/sections/Feed';

export default function ApparelPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feed */}
      <Feed directory="apparel_placeholders" />
    </div>
  );
}