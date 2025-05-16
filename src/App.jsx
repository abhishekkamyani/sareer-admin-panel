import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import {Dashboard} from './pages/Dashboard';
import { BookManagement } from './pages/BookManagement';
// import Settings from './pages/Settings';
// Import other pages as needed

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-book" element={<BookManagement
           />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;