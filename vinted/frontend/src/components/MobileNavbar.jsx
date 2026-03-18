import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaPlus, FaTachometerAlt, FaUser } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import '../styles/MobileNavbar.css';

const MobileNavbar = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSellClick = () => {
        if (!user) {
            navigate('/login');
        } else {
            navigate('/sell');
        }
    };

    return (
        <div className="mobile-navbar">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FaHome className="nav-icon" />
            </NavLink>
            
            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FaSearch className="nav-icon" />
            </NavLink>

            <div className="nav-item sell-item" onClick={handleSellClick}>
                <div className="sell-icon-wrapper">
                    <FaPlus className="nav-icon sell-icon" />
                </div>
            </div>

            <NavLink to="/profile?tab=dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FaTachometerAlt className="nav-icon" />
            </NavLink>

            <NavLink to="/profile?tab=profile_settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FaUser className="nav-icon" />
            </NavLink>
        </div>
    );
};

export default MobileNavbar;
