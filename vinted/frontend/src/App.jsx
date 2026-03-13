import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import SellItem from './pages/SellItem';
import ItemDetail from './pages/ItemDetail';
import SellerProfile from './pages/SellerProfile';
import Notifications from './pages/Notifications';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import NotFound from './pages/NotFound';
import DynamicPage from './pages/DynamicPage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryPage from './pages/CategoryPage';
import SubcategoryItemsPage from './pages/SubcategoryItemsPage';
import Maintenance from './pages/Maintenance';
import { useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsent from './components/common/CookieConsent';

// Layout wrapper to conditionally show Header/Footer
const Layout = ({ children }) => {
  const { settings } = useSettings();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // If maintenance mode is ON and we're not explicitly trying to access admin (which is now separate anyway)
  // Show maintenance page instead of the site
  if (settings?.maintenance_mode) {
    return <Maintenance />;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? '' : 'flex-grow-1'}>
        {children}
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <CookieConsent />}
    </div>
  );
};

const App = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <CurrencyProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <Router>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/sell" element={<SellItem />} />
                        <Route path="/items/:id" element={<ItemDetail />} />
                        <Route path="/seller/:id" element={<SellerProfile />} />
                        <Route path="/profile/:id" element={<SellerProfile />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/categories/:slug" element={<CategoryPage />} />
                        <Route path="/categories/:slug/:subSlug" element={<SubcategoryItemsPage />} />
                        <Route path="/pages/:slug" element={<DynamicPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </Router>
                </NotificationProvider>
              </LanguageProvider>
            </CurrencyProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;
