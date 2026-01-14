import React from 'react';

const Footer = () => {
    return (
        <footer className="app-footer">
            <div className="container footer-content">
                <div className="copyright">
                    © {new Date().getFullYear()} Ullu Chat. Anonymous connections, real conversations.
                </div>
                <div className="footer-links">
                    <a href="#" className="footer-link">Privacy First</a>
                    <a href="#" className="footer-link">Terms</a>
                    <a href="#" className="footer-link">Safety</a>
                    <a href="#" className="footer-link">Help</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
