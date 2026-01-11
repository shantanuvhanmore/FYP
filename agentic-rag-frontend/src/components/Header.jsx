import React from 'react';
import './Header.css';
import logoLeft from '../assets/logo-left.png';
import logoRight from '../assets/logo-right.png';

export default function Header({ onToggleSidebar }) {
    return (
        <div className="main-header">
            <div className="header-left">
                <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <img
                    src={logoLeft}
                    alt="NMIET Logo"
                    className="header-logo"
                />
            </div>
            <div className="header-center">
                <div className="college-name-main">NUTAN MAHARASHTRA VIDYA PRASARAK MANDAL'S</div>
                <div className="college-name-full">NUTAN MAHARASHTRA INSTITUTE OF ENGINEERING & TECHNOLOGY</div>
                <div className="college-department">DEPARTMENT OF COMPUTER ENGINEERING</div>
            </div>
            <div className="header-right">
                <img
                    src={logoRight}
                    alt="Founder Logo"
                    className="header-logo"
                />
            </div>
        </div>
    );
}
