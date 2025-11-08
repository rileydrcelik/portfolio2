import Feed from '@/components/sections/Feed';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feed */}
      <Feed directory="pinterest_placeholders" />
    </div>
  );
}