import React from 'react';
import Index from 'views/Index.js';
import Profile from 'views/examples/Profile.js';
import Sales from 'views/examples/Sales.js'; // Corrected import path
import Register from 'views/examples/Register.js';
import Login from 'views/examples/Login.js';
import Tables from 'views/examples/Tables.js';
import Icons from 'views/examples/Icons.js';
import AuthRoute from 'components/AuthRoute.js';
import UserList from './views/examples/UserList.js'; // Corrected import path
import TaxReportForm from './views/examples/TaxReportForm';  // Add import for TaxReportForm
import TaxReportsList from './views/examples/TaxReportsList'; // Add import for TaxReportsList
import CreateInvoice from './views/examples/CreateInvoice';
import InvoiceList from './views/examples/InvoiceList';
var routes = [
  {
    path: '/index',
    name: 'Dashboard',
    icon: 'ni ni-tv-2 text-primary',
    component: (
        <AuthRoute>
          <Index />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/users',
    name: 'Users List',
    icon: 'ni ni-bullet-list-67 text-red',
    component: (
        <AuthRoute>
          <UserList />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/create-invoice',
    name: 'Create Invoice',
    icon: 'ni ni-paper-diploma text-blue',
    component: (
        <AuthRoute>
          <CreateInvoice />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  // ✅ Nouvelle route pour la liste des factures
  {
    path: '/invoices',
    name: 'Invoices List',
    icon: 'ni ni-bullet-list-67 text-green',
    component: (
        <AuthRoute>
          <InvoiceList />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/icons',
    name: 'Icons',
    icon: 'ni ni-planet text-blue',
    component: (
        <AuthRoute>
          <Icons />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/sales', // Updated path
    name: 'Sales', // Updated name
    icon: 'ni ni-cart text-orange', // Updated icon
    component: (
        <AuthRoute>
          <Sales /> {/* Updated component */}
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/user-profile',
    name: 'User Profile',
    icon: 'ni ni-single-02 text-yellow',
    component: (
        <AuthRoute>
          <Profile />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/tables',
    name: 'Tables',
    icon: 'ni ni-bullet-list-67 text-red',
    component: (
        <AuthRoute>
          <Tables />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/tax-report',
    name: 'Generate Tax Report',
    icon: 'ni ni-file-03 text-green',
    component: (
        <AuthRoute>
          <TaxReportForm />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/tax-reports',
    name: 'Tax Reports List',
    icon: 'ni ni-collection text-purple',
    component: (
        <AuthRoute>
          <TaxReportsList />
        </AuthRoute>
    ),
    layout: '/admin',
  },
  {
    path: '/login',
    name: 'Login',
    icon: 'ni ni-key-25 text-info',
    component: <Login />,
    layout: '/auth',
  },
  {
    path: '/register',
    name: 'Register',
    icon: 'ni ni-circle-08 text-pink',
    component: <Register />,
    layout: '/auth',
  },
];

export default routes;
