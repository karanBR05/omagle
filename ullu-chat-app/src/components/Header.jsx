import React from 'react';
import { Bird, Menu } from 'lucide-react';

const Header = ({ toggleMobileMenu, isMobileMenuOpen }) => {
  return (
    <header className="app-header">
      <div className="container header-content">
        <a href="#" className="logo">
          <div className="logo-icon">
            <img src="/llop.png" alt="Ullu Chat Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className="logo-text">Ullu Chat</div>
            <span className="logo-tagline">Anonymous Smart Chat</span>
          </div>
        </a>

        <button
          className="mobile-menu-btn"
          id="mobileMenuBtn"
          onClick={toggleMobileMenu}
        >
          <Menu size={24} />
        </button>

        <nav className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`} id="navLinks">
          <a href="#" className="nav-link active">Home</a>
          <a href="#" className="nav-link">Features</a>
          <a href="#" className="nav-link">Safety</a>
          <a href="#" className="nav-link">FAQ</a>
          <a href="#" className="nav-link">Contact</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
