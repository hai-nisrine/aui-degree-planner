import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../../../Assets/logo3.svg";

const Navbar = () => {
    const navigate = useNavigate();

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <nav>
            <div className="nav-logo-container">
                <img src={Logo} alt="AUI Degree Planner logo" />
                <span className="nav-logo-text">Degree Planner</span>
            </div>
            <div className="navbar-links-container">
                <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }} style={{ cursor: 'pointer' }}>Home</a>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} style={{ cursor: 'pointer' }}>Features</a>
                <a href="#get-started" onClick={(e) => { e.preventDefault(); scrollToSection('get-started'); }} style={{ cursor: 'pointer' }}>Get Started</a>
                <button className="primary-button" onClick={() => navigate("/login")}>Login</button>
            </div>
        </nav>
    );
};

export default Navbar;
