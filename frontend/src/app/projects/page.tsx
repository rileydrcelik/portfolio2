import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'robotics', name: 'Robotics', count: 0 },
  { id: 'apps', name: 'Apps', count: 0 },
  { id: 'ai_data_science', name: 'AI/Data Science', count: 0 },
  { id: 'webdev', name: 'Web Dev', count: 0 },
  { id: 'design', name: 'Design', count: 0 },
  { id: 'software_other', name: 'Software (Other)', count: 0 },
];

export default function ProjectsPage() {
  return (
    <SectionWithFeed
      title="Projects"
      directory="pinterest_placeholders"
      albums={albums}
    />
  );
}