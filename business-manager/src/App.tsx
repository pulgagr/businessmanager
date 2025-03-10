import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Quotes from './pages/Quotes';
import MissingQuotes from './pages/MissingQuotes';
import MonthlySales from './pages/MonthlySales';
import Settings from './pages/Settings';
import UnpaidOrders from './pages/UnpaidOrders';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:clientId" element={<ClientDetail />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/missing-quotes" element={<MissingQuotes />} />
          <Route path="/monthly-sales" element={<MonthlySales />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/unpaid-orders" element={<UnpaidOrders />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
