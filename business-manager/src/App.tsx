import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Quotes from './pages/Quotes';
import MissingQuotes from './pages/MissingQuotes';
import MonthlySales from './pages/MonthlySales';
import Settings from './pages/Settings';
import UnpaidOrders from './pages/UnpaidOrders';
import SampleInvoice from './pages/SampleInvoice';
import ClientReportPage from './pages/ClientReportPage';
import TrackingPage from './pages/Tracking';

const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes with Layout */}
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:clientId" element={<ClientDetail />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/missing-quotes" element={<MissingQuotes />} />
          <Route path="/monthly-sales" element={<MonthlySales />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/unpaid-orders" element={<UnpaidOrders />} />
          <Route path="/tracking" element={<TrackingPage />} />
        </Route>

        {/* Routes without Layout */}
        <Route path="/client-report" element={<ClientReportPage />} />
        <Route path="/sample-invoice" element={<SampleInvoice />} />
      </Routes>
    </Router>
  );
}

export default App;
