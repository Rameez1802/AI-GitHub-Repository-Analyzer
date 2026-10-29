import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/layout/Layout.jsx';
import Home from '@/pages/Home.jsx';
import Analysis from '@/pages/Analysis.jsx';
import About from '@/pages/About.jsx';
import NotFound from '@/pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="analyse/:owner/:repo" element={<Analysis />} />
        <Route path="analyse" element={<Navigate to="/" replace />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
