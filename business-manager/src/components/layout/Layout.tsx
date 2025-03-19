import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  ExclamationCircleIcon, 
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { settingsApi } from '../../services/api';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [companyName, setCompanyName] = useState('Business Manager');
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        if (response.data.companyName) {
          setCompanyName(response.data.companyName);
        }
      } catch (error) {
        console.error('Error fetching company name:', error);
      }
    };
    fetchSettings();
  }, []);

  const navigationSections = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', href: '/', icon: HomeIcon },
        { name: 'Clients', href: '/clients', icon: UserGroupIcon },
      ]
    },
    {
      title: 'Sales',
      items: [
        { name: 'Quotes', href: '/quotes', icon: DocumentTextIcon },
        { name: 'Missing Quotes', href: '/missing-quotes', icon: ExclamationCircleIcon },
        { name: 'Monthly Sales', href: '/monthly-sales', icon: ChartBarIcon },
        { name: 'Unpaid Orders', href: '/unpaid-orders', icon: CurrencyDollarIcon },
        { name: 'Shipments Management', href: '/tracking', icon: TruckIcon },
        { name: 'Delivery Tracker', href: '/shipments-list', icon: TruckIcon },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${isExpanded ? 'w-64' : 'w-16'} transition-all duration-300`}>
      <div className="flex items-center h-16 px-4">
        {isExpanded ? (
          <h1 className="text-sm font-medium text-gray-200">{companyName}</h1>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-200">
              {companyName.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-8 px-2 py-4">
        {navigationSections.map((section) => (
          <div key={section.title}>
            {isExpanded && (
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className={`mt-2 space-y-1`}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-gray-800 text-gray-200'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    <item.icon
                      className={`flex-shrink-0 h-5 w-5 transition-colors ${
                        isActive ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                    {isExpanded && (
                      <span className="ml-3">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ChevronRightIcon 
          className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );

  return (
    <div className="h-full bg-gray-100">
      <div className="flex h-full">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Mobile sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gray-900`}>
          <SidebarContent />
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block bg-gray-900">
          <SidebarContent />
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          {/* Mobile header */}
          <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout; 