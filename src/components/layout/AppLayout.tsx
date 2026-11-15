import Header from './Header';
import TopicSidebar from './TopicSidebar';
import Viewport3D from '../viewport/Viewport3D';
import SpecPanel from '../spec/SpecPanel';

// סרגל נושאים אופקי, ומתחתיו: מודל תלת-ממדי בשני שליש | מפרט בשליש. בנייד: זה מעל זה
export default function AppLayout() {
  return (
    <div className="flex h-full flex-col text-ink">
      <Header />
      <TopicSidebar />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="min-h-0 min-w-0 flex-[1.618] md:flex-[2]">
          <Viewport3D />
        </main>
        <SpecPanel />
      </div>
    </div>
  );
}
