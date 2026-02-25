// ============================================================
//  components/layout/AppLayout.jsx  —  Main Layout Wrapper
//  Wraps all authenticated pages with the sidebar
// ============================================================
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
