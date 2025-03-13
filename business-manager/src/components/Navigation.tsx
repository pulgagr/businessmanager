import { Link, useLocation } from 'react-router-dom';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'HomeIcon' },
  { name: 'Clients', href: '/clients', icon: 'UserGroupIcon' },
  { name: 'Quotes', href: '/quotes', icon: 'DocumentTextIcon' },
  { name: 'Missing Quotes', href: '/missing-quotes', icon: 'ClipboardDocumentListIcon' },
  { name: 'Monthly Sales', href: '/monthly-sales', icon: 'BanknotesIcon' },
  { name: 'Unpaid Orders', href: '/unpaid-orders', icon: 'CreditCardIcon' },
  { name: 'Tracking', href: '/tracking', icon: 'TruckIcon' },
  { name: 'Settings', href: '/settings', icon: 'Cog6ToothIcon' },
]; 