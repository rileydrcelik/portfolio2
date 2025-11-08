import SectionWithFeed from '@/components/sections/SectionWithFeed';

export default function ProjectsPage() {
  return (
    <SectionWithFeed
      title="Projects"
      directory="pinterest_placeholders"
      category="projects"
      categorySlug="projects"
      useDatabase={true}
    />
  );
}